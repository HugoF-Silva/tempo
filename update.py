import boto3
import time

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('user_route_times')  # Set this to your DynamoDB table name

# Scan all items (for big tables, use pagination)
response = table.scan()
items = response['Items']

now = int(time.time())
ttl_value = now + 48 * 60 * 60  # 48 hours from now

for item in items:
    key = {
        "user_phone": item["user_phone"],
        "unit": item["unit"]
    }
    # Update the item with the new ttl
    table.update_item(
        Key=key,
        UpdateExpression="SET #ttl = :ttl",
        ExpressionAttributeNames={"#ttl": "ttl"},
        ExpressionAttributeValues={":ttl": ttl_value}
    )
    print(f"Updated {key} with ttl={ttl_value}")