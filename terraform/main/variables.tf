variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "lambda_runtime" {
  description = "Runtime for all Lambda functions"
  type        = string
  default     = "nodejs18.x"
}