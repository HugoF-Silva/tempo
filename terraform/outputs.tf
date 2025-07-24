# outputs.tf
output "websocket_api_endpoint" {
  description = "WebSocket URL to connect from your React app"
  value       = "${replace(aws_apigatewayv2_api.websocket.api_endpoint, "wss://", "wss://")}/${aws_apigatewayv2_stage.prod.name}"
}
