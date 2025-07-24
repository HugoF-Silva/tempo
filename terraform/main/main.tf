# ------------------------------------------------------------
# 1. Replace your existing resource "aws_lambda_function.connect"
#    with a data source that looks up the already‑deployed Lambda:
# ------------------------------------------------------------
data "aws_lambda_function" "connect" {
  function_name = var.conn_lambda_function_name
}

# (Optionally do the same for broadcast if it, too, already exists)
# data "aws_lambda_function" "broadcast" {
#   function_name = var.bcast_lambda_function_name
# }

# ------------------------------------------------------------
# 2. Create the integration pointing at that existing Lambda:
# ------------------------------------------------------------
resource "aws_apigatewayv2_integration" "connect_integration" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = data.aws_lambda_function.connect.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

# (And similarly for broadcast)
# resource "aws_apigatewayv2_integration" "broadcast_integration" {
#   api_id           = aws_apigatewayv2_api.websocket.id
#   integration_type = "AWS_PROXY"
#   integration_uri  = data.aws_lambda_function.broadcast.invoke_arn
#   integration_method = "POST"
#   payload_format_version = "2.0"
# }

# ------------------------------------------------------------
# 3. Wire up your routes to use those integrations:
# ------------------------------------------------------------
resource "aws_apigatewayv2_route" "connect_route" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect_integration.id}"
}

resource "aws_apigatewayv2_route" "disconnect_route" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.connect_integration.id}"
}

resource "aws_apigatewayv2_route" "default_route" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.broadcast_integration.id}"
}

# ------------------------------------------------------------
# 4. Make sure API Gateway can invoke your Lambda
# ------------------------------------------------------------
resource "aws_lambda_permission" "allow_apigw_connect" {
  statement_id  = "AllowExecutionFromAPIGatewayConnect"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/@connect"
}

resource "aws_lambda_permission" "allow_apigw_default" {
  statement_id  = "AllowExecutionFromAPIGatewayDefault"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.broadcast.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

# ------------------------------------------------------------
# 5. Deploy a stage (if you havent already)
# ------------------------------------------------------------
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = "prod"
  auto_deploy = true
}
