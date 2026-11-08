# Errores, reintentos e idempotencia

## Errores de la API

El formato es el esquema `ErrorResponse` de [openapi.yaml](../../contracts/openapi.yaml), donde están los ejemplos. Sus campos se usan así:

- `code`: estable; es lo que el cliente usa para decidir qué hacer.
- `message`: legible por humanos; puede cambiar, así que el cliente no depende de su texto.
- `request_id`: el mismo valor de la cabecera `x-request-id` y del `correlation_id` de los [logs](logs.md). Sale de `requestContext.requestId`.
- `details`: opcional, con el contexto del error.

HTTP API no permite personalizar las respuestas que genera el propio gateway, y estas no llevan `x-request-id`. Por lo tanto, el cliente decide primero por el código HTTP y, solo si existe, refina con `error.code`.

| HTTP | `code` | Origen | Cuándo ocurre | Qué hace el cliente |
|---|---|---|---|---|
| 401 | *(sin código)* | API Gateway | Falta la cabecera `x-api-key`; no se invoca el authorizer. | Pedir la llave. |
| 403 | *(sin código)* | API Gateway | La llave no es válida. | Volver a pedir la llave. |
| 400 | `INVALID_PARAMETER` | Función | Un parámetro no cumple su formato o rango (`limit=500`, `id=abc`). | Corregir la entrada. |
| 400 | `INVALID_PAGINATION_TOKEN` | Función | `next_token` está mal formado. | Volver a la primera página. |
| 404 | `ITEM_NOT_FOUND` | Función | El `id` no existe. | Mostrar "sin resultados". |
| 500 | `INTERNAL_ERROR` | Función | Excepción no controlada; se registra con traza completa y no se exponen detalles. | Mensaje genérico con `request_id`. |
| 503 | `DEPENDENCY_UNAVAILABLE` | Función | DynamoDB no responde o aplica throttling, tras los reintentos del SDK. | Reintentar hasta dos veces adicionales, con esperas de 500 ms y 1.000 ms. |
| 404 | *(sin código)* | API Gateway | Ruta no definida. Cuerpo `{"message":"Not Found"}`. | Error de programación. |
| 429 | *(sin código)* | API Gateway | Throttling. Cuerpo `{"message":"Too Many Requests"}`. | No realiza reintentos automáticos; muestra el error correspondiente. |
| 500, 503 o 504 | *(sin código)* | API Gateway | La función falló, agotó su tiempo o no se pudo invocar. Cuerpo `{"message": ...}`. El código exacto por timeout se confirma en AWS *(verificar)*. | Si recibe HTTP 503, aplica los reintentos configurados; para 500 y 504 no realiza reintentos automáticos. |

## Errores de la carga

**Errores de archivo.** Detienen la carga con estado `FAILED`:

| `code` | Cuándo ocurre | Qué hace la función |
|---|---|---|
| `ENCODING_ERROR` | El archivo no es UTF-8 válido. | Lo registra en el reporte y termina sin excepción. |
| `HEADER_MISMATCH` | El encabezado no coincide con las columnas del contrato. | Lo registra en el reporte y termina sin excepción. |
| `FILE_TOO_LARGE` | El archivo supera el límite configurado de 3 MB, coherente con la capacidad de RNF-06 para filas de este perfil. | Lo registra en el reporte y termina sin excepción. |
| `WRITE_FAILED` | DynamoDB sigue devolviendo ítems sin procesar después de los reintentos. | Escribe el reporte `FAILED` y propaga la excepción para que Lambda reintente. |
| `TIME_LIMIT_REACHED` | La carga se acerca al timeout de la función sin haber terminado. | Escribe el reporte `FAILED` y termina sin excepción. |

La diferencia es deliberada: un error de contenido no se arregla reintentando, y `TIME_LIMIT_REACHED` tampoco, porque el reintento repetiría la misma carga. Por eso, la invocación se da por exitosa y no ocupa los reintentos. En cambio, los errores transitorios (`WRITE_FAILED`, fallos de red con S3) se propagan para que Lambda reintente. Si persisten, Lambda descarta el evento: el fallo queda en el reporte o en los logs, y el archivo sigue en `incoming/` para repetir la carga.

**Errores por fila.** La fila va a `rejected.csv` y la carga continúa:

| `code` | Cuándo ocurre |
|---|---|
| `MISSING_REQUIRED_VALUE` | Celda vacía en una columna obligatoria. |
| `TYPE_CAST_FAILED` | El valor no se puede convertir al tipo del contrato. |
| `DUPLICATE_PRIMARY_KEY` | El `Volcano_Number` ya apareció antes en el archivo. |
| `MALFORMED_ROW` | La fila tiene un número de campos distinto al encabezado. |

## Reintentos e idempotencia

| Punto | Estrategia |
|---|---|
| SDK hacia DynamoDB y S3 | Reintentos en modo `standard` del AWS SDK v3 (espera exponencial con jitter). En la API, `maxAttempts: 2`, con `requestHandler` de 1 s de conexión y 2 s de petición: una dependencia lenta falla en unos 6 s más la espera entre intentos *(verificar)*, por debajo del timeout de 10 s, y la función alcanza a responder `503 DEPENDENCY_UNAVAILABLE`. |
| Ritmo de escritura | El [escritor](funciones.md#carga) se mantiene en 20 WCU/s, para que el throttling sea la excepción. |
| `BatchWriteItem` | Los `UnprocessedItems` se reintentan con espera exponencial hasta 5 veces; si persisten, `WRITE_FAILED`. |
| Invocación asíncrona | `maximum_retry_attempts = 2` (1 y 2 minutos después del fallo) y `maximum_event_age_in_seconds = 3600`; luego Lambda descarta el evento. Para reprocesar, se vuelve a subir el archivo. |
| Repetición de la carga | Segura, porque la escritura por clave primaria es idempotente. Esto incluye repetir una carga que falló a mitad de archivo con filas ya escritas. |
