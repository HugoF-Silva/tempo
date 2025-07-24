variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "lambda_runtime" {
  description = "Runtime for all Lambda functions"
  type        = string
  default     = "nodejs18.x"
}

variable "connections_table_name" {
  description = "Name of the existing DynamoDB table for connections"
  type        = string
  default     = "ws_connections"
}

variable "conn_lambda_role_name" {
  description = "Name of the existing IAM role for connect/disconnect Lambdas"
  type        = string
  default     = "wsLambdaExecRole-conn"
}

variable "bcast_lambda_role_name" {
  description = "Name of the existing IAM role for broadcast Lambda"
  type        = string
  default     = "wsLambdaExecRole-bcast"
}

variable "conn_lambda_function_name" {
  description = "Name of the existing Lambda function for $connect"
  type        = string
  default     = "ws_connect_handler"
}

variable "bcast_lambda_function_name" {
  description = "Name of the existing Lambda function for broadcast"
  type        = string
  default     = "ws_broadcast_handler"
}
