provider "aws" {
  region = var.aws_region
}

# DynamoDB table
resource "aws_dynamodb_table" "connections" {
  name         = var.connections_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }
}

# IAM role for $connect/$disconnect
resource "aws_iam_role" "conn_lambda_role" {
  name               = "${var.lambda_role_name}-conn"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# policy for the connection handlers
resource "aws_iam_role_policy" "conn_lambda_policy" {
  name = "ConnLambdaDDBPolicy"
  role = aws_iam_role.conn_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["dynamodb:PutItem","dynamodb:DeleteItem"]
      Effect   = "Allow"
      Resource = aws_dynamodb_table.connections.arn
    }]
  })
}

# IAM role for broadcast
resource "aws_iam_role" "bcast_lambda_role" {
  name               = "${var.lambda_role_name}-bcast"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# policy for the broadcast handler
resource "aws_iam_role_policy" "bcast_lambda_policy" {
  name = "BcastLambdaPolicy"
  role = aws_iam_role.bcast_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["dynamodb:Scan"]
        Effect   = "Allow"
        Resource = aws_dynamodb_table.connections.arn
      },
      {
        Action   = ["execute-api:ManageConnections"]
        Effect   = "Allow"
        Resource = "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*/*"
      }
    ]
  })
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_caller_identity" "current" {}
