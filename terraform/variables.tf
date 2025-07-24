variable "connections_table_name" {
  description = "DynamoDB table for storing WS connection IDs"
  type        = string
  default     = "ws_connections"
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs18.x"
}

variable "lambda_role_name" {
  description = "Base name for Lambda execution roles"
  type        = string
  default     = "wsLambdaExecRole"
}

variable "cron_schedule" {
  description = "Cron expression for the diff/broadcast Lambda"
  type        = string
  default     = "cron(0 * * * ? *)"
}
