resource "aws_dynamodb_table" "items" {
  name           = "${local.name_prefix}-items"
  billing_mode   = "PROVISIONED"
  read_capacity  = 25
  write_capacity = 25
  hash_key       = "Volcano_Number"

  attribute {
    name = "Volcano_Number"
    type = "N"
  }
}
