# main.tf
provider "aws" {
  region = var.aws_region
}

# 1) DynamoDB table for connections
resource "aws_dynamodb_table" "connections" {
  name         = var.connections_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }
}

# 2) IAM Role & Policy for connect/disconnect Lambdas
data "aws_iam_policy_document" "conn_lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "conn_lambda_role" {
  name               = "${var.lambda_role_name}-conn"
  assume_role_policy = data.aws_iam_policy_document.conn_lambda_assume.json
}

resource "aws_iam_role_policy" "conn_lambda_policy" {
  name = "ConnLambdaDDBPolicy"
  role = aws_iam_role.conn_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Effect   = "Allow"
        Resource = aws_dynamodb_table.connections.arn
      }
    ]
  })
}

# 3) IAM Role & Policy for broadcast Lambda
resource "aws_iam_role" "bcast_lambda_role" {
  name               = "${var.lambda_role_name}-bcast"
  assume_role_policy = data.aws_iam_policy_document.conn_lambda_assume.json
}

resource "aws_iam_role_policy" "bcast_lambda_policy" {
  name = "BcastLambdaPolicy"
  role = aws_iam_role.bcast_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:Scan"
        ]
        Effect   = "Allow"
        Resource = aws_dynamodb_table.connections.arn
      },
      {
        Action = [
          "execute-api:ManageConnections"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.websocket.id}/*"
      }
    ]
  })
}

data "aws_caller_identity" "current" {}

# 4) Package & deploy Lambdas
resource "aws_lambda_function" "connect" {
  filename         = "connect.zip"
  function_name    = "ws_connect_handler"
  role             = aws_iam_role.conn_lambda_role.arn
  handler          = "connect.handler"
  runtime          = var.lambda_runtime
  publish          = true
  source_code_hash = filebase64sha256("connect.zip")
  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    }
  }
}

resource "aws_lambda_function" "disconnect" {
  filename         = "disconnect.zip"
  function_name    = "ws_disconnect_handler"
  role             = aws_iam_role.conn_lambda_role.arn
  handler          = "disconnect.handler"
  runtime          = var.lambda_runtime
  publish          = true
  source_code_hash = filebase64sha256("disconnect.zip")
  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    }
  }
}

resource "aws_lambda_function" "broadcast" {
  filename         = "broadcast.zip"
  function_name    = "ws_broadcast_handler"
  role             = aws_iam_role.bcast_lambda_role.arn
  handler          = "broadcast.handler"
  runtime          = var.lambda_runtime
  publish          = true
  source_code_hash = filebase64sha256("broadcast.zip")
  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
      WS_API_ID         = aws_apigatewayv2_api.websocket.id
    }
  }
}

# 5) API Gateway V2 WebSocket API
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "healthCentersWS"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

# 6) Integrations
resource "aws_apigatewayv2_integration" "connect" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.connect.invoke_arn
}

resource "aws_apigatewayv2_integration" "disconnect" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.disconnect.invoke_arn
}

resource "aws_apigatewayv2_integration" "healthCentersSubscribe" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.connect.invoke_arn
}

# 7) Routes
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect.id}"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect.id}"
}

resource "aws_apigatewayv2_route" "subscribe" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "healthCentersSubscribe"
  target    = "integrations/${aws_apigatewayv2_integration.healthCentersSubscribe.id}"
}

# 8) Deploy stage
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = "prod"
  auto_deploy = true
}

# 9) Lambda permissions for API Gateway
resource "aws_lambda_permission" "allow_apigw_connect" {
  statement_id  = "AllowExecutionFromAPIGatewayConnect"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/$connect"
}

resource "aws_lambda_permission" "allow_apigw_disconnect" {
  statement_id  = "AllowExecutionFromAPIGatewayDisconnect"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.disconnect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/$disconnect"
}

resource "aws_lambda_permission" "allow_apigw_subscribe" {
  statement_id  = "AllowExecutionFromAPIGatewaySubscribe"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/healthCentersSubscribe"
}

# 10) CloudWatch EventBridge rule for cron → broadcast Lambda
resource "aws_cloudwatch_event_rule" "hourly_diff" {
  name                = "hourly-healthcenters-diff"
  schedule_expression = var.cron_schedule
}

resource "aws_cloudwatch_event_target" "invoke_broadcast" {
  rule      = aws_cloudwatch_event_rule.hourly_diff.name
  target_id = "BroadcastLambda"
  arn       = aws_lambda_function.broadcast.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.broadcast.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.hourly_diff.arn
}
