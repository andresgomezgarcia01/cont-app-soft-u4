# Pruebas

Localmente se valida todo lo que se pueda **sin credenciales de AWS, Docker ni emuladores** ([ADR-0013](../adr/ADR-0013-pruebas-locales-sin-emuladores.md)). Lo netamente funcional se comprueba en la nube.

Las validaciones locales son opcionales, porque los [pipelines](despliegue.md#pipelines) ejecutan las mismas en cada pull request.

## Niveles

| Nivel | Qué prueba | Herramienta |
|---|---|---|
| Terraform | Formato y validez de la configuración: `terraform fmt -check`, `terraform init -backend=false` y `terraform validate`. No requieren credenciales. | Terraform |
| Unitarias | Cada manejador de la cadena, la conversión de tipos, la limitación de ritmo, el enrutador, la validación de parámetros, el mapeo de errores y los campos obligatorios de los [logs](logs.md). | `node:test` |
| Authorizer | La comparación de la llave, la relectura del parámetro y el fallo al leerlo. | `pytest` + `moto` |
| Flujo local | El handler de `loader` recibe un evento de notificación de S3 de prueba (con el formato real), lee un CSV de muestra y envía a DynamoDB los ítems esperados. Por separado, el handler de `api` recibe eventos de API Gateway de prueba y responde según el contrato. | `node:test` + `aws-sdk-client-mock` |
| Frontend automatizado | Pruebas del cliente de API, incluyendo respuestas exitosas, errores de autenticación y reintentos ante respuestas HTTP 503. | `Vitest` + `jsdom` |
| Frontend manual | La interfaz, en el servidor local de desarrollo, contra la API desplegada y con una llave. | Navegador |
| Extremo a extremo | Carga real, conteo y consultas en AWS. | Reporte de la carga, consola de AWS y pruebas manuales |

`aws-sdk-client-mock` simula las respuestas del AWS SDK dentro de las pruebas de Node.js, y `moto` simula Parameter Store dentro de `pytest`. Los eventos de prueba se guardan como JSON en `services/*/tests/events/`, de modo que también sirven para invocar las funciones desde la consola de Lambda.

## Verificación de la carga

No hay un script de verificación: se usan el reporte y la consola de AWS, sin credenciales locales.

1. **Reporte.** En `reports/<run_id>/summary.json` se comprueba el estado `SUCCEEDED`, `rows_read = rows_written` y `rows_rejected = 0`. `rows_read` se cuenta con el lector de CSV, así que debe dar 1 214, aunque `wc -l` dé 1 227 por los saltos de línea dentro de celdas.
2. **Conteo en la tabla.** Se compara `rows_read` con el conteo en vivo de la consola de DynamoDB *(verificar la opción y su consumo)*. El contador normal de la consola no sirve, porque se actualiza aproximadamente cada 6 horas.

Para que los conteos coincidan, la tabla debe estar limpia: la carga sobrescribe, pero no borra. Antes de una carga final, se recrea la tabla con la opción manual `recreate-table` de `infra.yml`.

## Desarrollo del frontend

Se desarrolla en local contra la API desplegada ([ADR-0009](../adr/ADR-0009-contract-first-openapi.md)): recibe la URL por una variable de entorno de compilación y usa la llave en la pantalla de ingreso. Eso es posible porque [CORS](seguridad.md#api-y-cors) admite el origen local. La primera versión de la función `api` devuelve los ejemplos de [openapi.yaml](../../contracts/openapi.yaml), de modo que el frontend puede empezar antes de que exista la lógica real. No se usa un mock local; a cambio, si la API no está desplegada, el frontend no avanza.
