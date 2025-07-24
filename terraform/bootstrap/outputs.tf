output "connections_table_name" {
  value = aws_dynamodb_table.connections.name
}

output "conn_lambda_role_name" {
  value = aws_iam_role.conn_lambda_role.name
}

output "bcast_lambda_role_name" {
  value = aws_iam_role.bcast_lambda_role.name
}