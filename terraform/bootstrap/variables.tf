variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "connections_table_name" {
  type    = string
  default = "ws_connections"
}

variable "lambda_role_name" {
  type    = string
  default = "wsLambdaExecRole"
}