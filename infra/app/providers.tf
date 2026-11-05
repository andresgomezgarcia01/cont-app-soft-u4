provider "aws" {
  default_tags {
    tags = {
      project    = "eds"
      env        = local.environment
      managed_by = "terraform"
    }
  }
}
