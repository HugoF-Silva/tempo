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

# (your existing websocket API + integrations here…)

# when you define your Lambdas, swap in the data roles:
resource "aws_lambda_function" "connect" {
  # …
  role = data.aws_iam_role.conn.arn
  # …
}

resource "aws_lambda_function" "broadcast" {
  # …
  role = data.aws_iam_role.bcast.arn

  environment {
    variables = {
      CONNECTIONS_TABLE = data.aws_dynamodb_table.connections.name
      WS_API_ID         = aws_apigatewayv2_api.websocket.id
    }
  }
}

# (rest of your API Gateway, CloudWatch rule, etc.)
