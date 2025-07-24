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

data "terraform_remote_state" "bootstrap" {
  backend = "local"
  config = {
    path = "../bootstrap/terraform.tfstate"
  }
}

data "aws_dynamodb_table" "connections" {
  name = data.terraform_remote_state.bootstrap.outputs.connections_table_name
}

data "aws_iam_role" "conn" {
  name = data.terraform_remote_state.bootstrap.outputs.conn_lambda_role_name
}

data "aws_iam_role" "bcast" {
  name = data.terraform_remote_state.bootstrap.outputs.bcast_lambda_role_name
}

resource "aws_apigatewayv2_api" "websocket" {
  name                       = "healthCentersWS"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

data "archive_file" "connect" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/connect"
  output_path = "${path.module}/connect.zip"
}

data "archive_file" "broadcast" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/broadcast"
  output_path = "${path.module}/broadcast.zip"
}

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

# …integrations, routes, stages, and CloudWatch rules go here…
