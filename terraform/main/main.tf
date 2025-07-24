terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Pull in your _existing_ resources by name
data "aws_dynamodb_table" "connections" {
  name = var.connections_table_name
}

data "aws_iam_role" "conn" {
  name = var.conn_lambda_role_name
}


data "aws_iam_role" "bcast" {
  name = var.bcast_lambda_role_name
}

# Create (or update) the WebSocket API
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "healthCentersWS"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

# Bundle Lambdas on the fly
data "archive_file" "connect" {
  type        = "zip"
  source_dir  = "../../lambda/connect"
  output_path = "../../connect.zip"
}

data "archive_file" "broadcast" {
  type        = "zip"
  source_dir  = "../../lambda/broadcast"
  output_path = "../../broadcast.zip"
}

# $connect handler
resource "aws_lambda_function" "connect" {
  function_name    = "ws_connect_handler"
  role             = data.aws_iam_role.conn.arn
  handler          = "connect.handler"
  runtime          = var.lambda_runtime
  filename         = data.archive_file.connect.output_path
  source_code_hash = data.archive_file.connect.output_base64sha256

  environment {
    variables = {
      CONNECTIONS_TABLE = data.aws_dynamodb_table.connections.name
    }
  }
}

# broadcast handler
resource "aws_lambda_function" "broadcast" {
  function_name    = "ws_broadcast_handler"
  role             = data.aws_iam_role.bcast.arn
  handler          = "broadcast.handler"
  runtime          = var.lambda_runtime
  filename         = data.archive_file.broadcast.output_path
  source_code_hash = data.archive_file.broadcast.output_base64sha256

  environment {
    variables = {
      CONNECTIONS_TABLE = data.aws_dynamodb_table.connections.name
      WS_API_ID         = aws_apigatewayv2_api.websocket.id
    }
  }
}

# …now add your integrations, routes, stages, CloudWatch rule, etc…
