data "aws_caller_identity" "current" {}

locals {
  environment = "dev"
  name_prefix = "eds-${local.environment}"
  account_id  = data.aws_caller_identity.current.account_id
}
