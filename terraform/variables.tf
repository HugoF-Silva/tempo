########################
# Variables
########################

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "connections_table_name" {
  description = "Name of the existing DynamoDB table used to track WebSocket connections"
  type        = string
  default     = "ws_connections"
}

variable "health_centers_table_name" {
  description = "Name of the existing DynamoDB table used to track health centers"
  type        = string
  default     = "health_centers"
}

variable "snapshot_table_name" {
  description = "Name of the existing DynamoDB table used to track health centers"
  type        = string
  default     = "health_centers_snapshot"
}

variable "deployment_id" {
  description = "Workflow trigger identifier"
  type        = string
}