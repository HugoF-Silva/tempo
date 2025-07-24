provider "aws" {
  region = var.aws_region
}

# pull in the bootstrap outputs
data "terraform_remote_state" "bootstrap" {
  backend = "local"
  config = {
    path = "../bootstrap/terraform.tfstate"
  }
}

# now reference (don't recreate) the table & roles
data "aws_dynamodb_table" "connections" {
  name = data.terraform_remote_state.bootstrap.outputs.connections_table_name
}

data "aws_iam_role" "conn" {
  name = data.terraform_remote_state.bootstrap.outputs.conn_lambda_role_name
}

data "aws_iam_role" "bcast" {
  name = data.terraform_remote_state.bootstrap.outputs.bcast_lambda_role_name
}

# ----------------------------------------
# Declare your WebSocket API
# ----------------------------------------
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "healthCentersWS"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

# ----------------------------------------
# Your Lambdas
# ----------------------------------------
resource "aws_lambda_function" "connect" {
  function_name    = "ws_connect_handler"
  role             = data.aws_iam_role.conn.arn
  handler          = "connect.handler"
  runtime          = var.lambda_runtime

  filename         = "connect.zip"
  source_code_hash = filebase64sha256("connect.zip")

  environment {
    variables = {
      CONNECTIONS_TABLE = data.aws_dynamodb_table.connections.name
    }
  }
}

resource "aws_lambda_function" "broadcast" {
  function_name    = "ws_broadcast_handler"
  role             = data.aws_iam_role.bcast.arn
  handler          = "broadcast.handler"
  runtime          = var.lambda_runtime

  filename         = "broadcast.zip"
  source_code_hash = filebase64sha256("broadcast.zip")

  environment {
    variables = {
      CONNECTIONS_TABLE = data.aws_dynamodb_table.connections.name
      WS_API_ID         = aws_apigatewayv2_api.websocket.id
    }
  }
}
