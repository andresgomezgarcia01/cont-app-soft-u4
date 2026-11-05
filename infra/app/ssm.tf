# Sin caracteres especiales, porque la llave viaja en una cabecera HTTP y se escribe a mano.
ephemeral "random_password" "api_key" {
  length  = 40
  special = false
}

resource "aws_ssm_parameter" "api_key" {
  name             = "/eds/${local.environment}/api-key"
  type             = "SecureString"
  value_wo         = ephemeral.random_password.api_key.result
  value_wo_version = var.api_key_version
}
