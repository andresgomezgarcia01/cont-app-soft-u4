variable "cors_allow_origins" {
  description = "Orígenes que el CORS de la API admite."
  type        = list(string)
  default     = ["*"]
}

variable "api_key_version" {
  description = "Versión de la llave de la API. Incrementarla genera y escribe una llave nueva."
  type        = number
  default     = 1
}
