terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.0.0"
}

provider "aws" {
  region = var.aws_region
}

########################
# Data Sources
########################

# Reference the existing DynamoDB table
data "aws_dynamodb_table" "connections" {
  name = var.connections_table_name
}

########################
# IAM Roles & Policies
########################

# Base Lambda role (CloudWatch Logs)
resource "aws_iam_role" "lambda_base" {
  name = "lambda-base-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_exec" {
  role       = aws_iam_role.lambda_base.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Grant PutItem/DeleteItem against the existing connections table
resource "aws_iam_role_policy" "dynamo_writes" {
  name = "lambda-dynamodb-access"
  role = aws_iam_role.lambda_base.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:PutItem", "dynamodb:DeleteItem"]
      Resource = data.aws_dynamodb_table.connections.arn
    }]
  })
}

# Role for broadcast (needs Scan/Delete + ManageConnections)
resource "aws_iam_role" "broadcast_lambda_role" {
  name               = "lambda-broadcast-execution-role"
  assume_role_policy = aws_iam_role.lambda_base.assume_role_policy
}

resource "aws_iam_role_policy_attachment" "broadcast_basic_exec" {
  role       = aws_iam_role.broadcast_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "broadcast_policy" {
  name = "lambda-broadcast-access"
  role = aws_iam_role.broadcast_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:Scan", "dynamodb:DeleteItem"]
        Resource = data.aws_dynamodb_table.connections.arn
      },
      {
        Effect   = "Allow"
        Action   = ["execute-api:ManageConnections"]
        Resource = "${aws_apigatewayv2_api.websocket.execution_arn}/*/@connections/*"
      }
    ]
  })
}

########################
# Package & Deploy Lambdas
########################

data "archive_file" "connect" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/connect"
  output_path = "${path.module}/connect.zip"
}

data "archive_file" "disconnect" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/disconnect"
  output_path = "${path.module}/disconnect.zip"
}

data "archive_file" "broadcast" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/broadcast"
  output_path = "${path.module}/broadcast.zip"
}

resource "aws_lambda_function" "connect" {
  function_name    = "connect"
  runtime          = "nodejs14.x"
  handler          = "handler.handler"
  role             = aws_iam_role.lambda_base.arn
  filename         = data.archive_file.connect.output_path
  source_code_hash = data.archive_file.connect.output_base64sha256

  environment {
    variables = {
      CONNECTIONS_TABLE = var.connections_table_name
    }
  }
}

resource "aws_lambda_function" "disconnect" {
  function_name    = "disconnect"
  runtime          = "nodejs14.x"
  handler          = "handler.handler"
  role             = aws_iam_role.lambda_base.arn
  filename         = data.archive_file.disconnect.output_path
  source_code_hash = data.archive_file.disconnect.output_base64sha256

  environment {
    variables = {
      CONNECTIONS_TABLE = var.connections_table_name
    }
  }
}

resource "aws_lambda_function" "broadcast" {
  function_name    = "broadcast"
  runtime          = "nodejs14.x"
  handler          = "handler.handler"
  role             = aws_iam_role.broadcast_lambda_role.arn
  filename         = data.archive_file.broadcast.output_path
  source_code_hash = data.archive_file.broadcast.output_base64sha256

  environment {
    variables = {
      CONNECTIONS_TABLE = var.connections_table_name
      WS_API_ID         = aws_apigatewayv2_api.websocket.id
    }
  }
}

########################
# WebSocket API
########################

resource "aws_apigatewayv2_api" "websocket" {
  name                       = "healthcenters-ws"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_integration" "connect" {
  api_id                 = aws_apigatewayv2_api.websocket.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.connect.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "disconnect" {
  api_id                 = aws_apigatewayv2_api.websocket.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.disconnect.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

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

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = "prod"
  auto_deploy = true
}

########################
# Permissions
########################

resource "aws_lambda_permission" "allow_apigw_connect" {
  statement_id  = "AllowAPIGWConnect"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/$connect"
}

resource "aws_lambda_permission" "allow_apigw_disconnect" {
  statement_id  = "AllowAPIGWDisconnect"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.disconnect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/$disconnect"
}
