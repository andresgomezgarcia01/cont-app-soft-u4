# Logs

El gateway y las tres funciones escriben en CloudWatch Logs con un esquema común en JSON. De este modo, una petición se puede seguir de punta a punta con un solo identificador, sin X-Ray ni librerías adicionales.

## Identificador de correlación

API Gateway asigna un `requestId` a cada petición y entrega ese mismo valor al authorizer y a la función `api`, en `requestContext.requestId`. Ese valor se registra como `correlation_id` y es el mismo `request_id` que recibe el cliente ([errores](errores.md#errores-de-la-api)). No debe confundirse con el campo `requestId` de los logs de Lambda, que identifica la invocación de la función, no la petición.

| Servicio | Valor de `correlation_id` | Cuándo escribe |
|---|---|---|
| `gateway` | `$context.requestId` | En cada petición. |
| `authorizer` | `requestContext.requestId` de la petición que lo invocó | Solo cuando la llave no está en la caché, como máximo una vez cada 300 s por llave. Las demás peticiones tienen su propio identificador, pero no pasan por esta función. |
| `api` | `requestContext.requestId` | En cada petición autorizada. |
| `loader` | `run_id` del [reporte](datos.md) | En cada carga. Es un flujo aparte, sin relación con las peticiones de la API. |

## Esquema común

| Campo | Lo escribe | Contenido |
|---|---|---|
| `timestamp`, `level`, `requestId` | Lambda en `authorizer`; `common/logs.mjs` en `api` y `loader` | Fecha, nivel e identificador de la invocación. En `authorizer`, Lambda agrega además `logger`. |
| `message` | Código | Nombre estable del evento, sin datos variables. |
| `service` | Código | `gateway`, `authorizer`, `api` o `loader`. |
| `correlation_id` | Código | Ver la tabla anterior. |
| `error_code` | Código | Solo si hay error, con el [catálogo de errores](errores.md). |

## Eventos

| Servicio | `message` | Nivel | Campos propios |
|---|---|---|---|
| `authorizer` | `auth_allowed` | INFO | Ninguno |
| `authorizer` | `auth_denied` | WARNING | Ninguno |
| `authorizer` | `auth_key_read_failed` | ERROR | Traza del error |
| `api` | `request_completed` | INFO | `route`, `status`, `duration_ms` |
| `api` | `request_failed` | ERROR | `route`, `status`, `duration_ms`, `error_code` y traza del error |
| `loader` | `load_started` | INFO | `source_key` |
| `loader` | `load_completed` | INFO | `source_key`, `status`, `rows_read`, `rows_written`, `rows_rejected`, `duration_ms` |
| `loader` | `load_failed` | ERROR | `source_key`, `status`, `error_code`, `duration_ms` y traza del error |

## Cómo se escribe

**En Node.js (`api` y `loader`).** Se usa un ayudante en `common/logs.mjs`, porque con `console.log(objeto)` Lambda deja el objeto dentro de `message` y el filtro por `correlation_id` no lo encontraría. Al escribir el JSON directamente, Lambda lo conserva tal cual, y sigue filtrando por nivel si trae `timestamp` y `level`:

```javascript
export function log(level, message, context, fields = {}) {
  process.stdout.write(`${JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId: context.awsRequestId,
    ...fields,
  })}\n`);
}

log("INFO", "request_completed", context, {
  service: "api",
  correlation_id: event.requestContext.requestId,
  route: event.routeKey,
  status: 200,
  duration_ms: 42,
});
```

Las trazas de error se escriben en los campos `errorType`, `errorMessage` y `stackTrace`.

**En Python (`authorizer`).** Se usa el módulo `logging`, y Lambda agrega los campos básicos:

```python
logger.warning(
    "auth_denied",
    extra={
        "service": "authorizer",
        "correlation_id": event["requestContext"]["requestId"],
    },
)
```

Lo que se escribe con `print` queda como texto plano. Los campos de `extra` no pueden llamarse como un atributo de `LogRecord` (`name`, `module`, `args`), porque Python lanza una excepción.

El nivel se configura en Terraform y no en el código.

## Access logs del gateway

El gateway escribe una línea por petición en su propio grupo de logs, incluidas las que rechaza antes de invocar `api` (401, 403, 404 de ruta y 429).

| Campo | Variable |
|---|---|
| `service` | `gateway`, como valor fijo |
| `message` | `request_completed`, como valor fijo |
| `correlation_id` | `$context.requestId` |
| `request_time` | `$context.requestTime` |
| `route` | `$context.routeKey` |
| `status` | `$context.status` |
| `response_latency_ms` | `$context.responseLatency` |
| `integration_status` | `$context.integrationStatus` |
| `integration_latency_ms` | `$context.integrationLatency` |
| `authorizer_error` | `$context.authorizer.error` |
| `integration_error` | `$context.integrationErrorMessage` |
| `lambda_request_id` | `$context.integration.requestId` *(verificar que coincide con el `requestId` de Lambda)* |

## Qué no se registra

- La llave. Por eso nunca se registra el evento completo ni sus `headers`: el evento trae `x-api-key` en `headers` y en `identitySource`.
- La IP ni el navegador de quien consulta, porque no se necesitan.
- Filas completas del dataset. Los rechazos ya quedan en `rejected.csv`.

## Grupos de logs y retención

| Grupo | Retención |
|---|---|
| `/aws/lambda/eds-dev-api` | 7 días |
| `/aws/lambda/eds-dev-loader` | 7 días |
| `/aws/lambda/eds-dev-authorizer` | 7 días |
| `/aws/apigateway/eds-dev-api` | 7 días |

Terraform crea los cuatro grupos y activa en cada función `log_format = "JSON"`.

## Cómo seguir una petición

El frontend muestra el `request_id` en los errores inesperados (UI-07). En los errores del propio gateway, que no traen ese campo, lo toma de la cabecera `apigw-requestid`; si no puede leerla, se busca por hora y código en los access logs. Con ese valor, se seleccionan los cuatro grupos en CloudWatch Logs Insights y se consulta:

```text
fields @timestamp, service, message, status, error_code
| filter correlation_id = "<request_id>"
| sort @timestamp asc
```

Si la función falla antes de escribir, como en un timeout, `lambda_request_id` permite buscar los eventos `platform.start` y `platform.report` de esa invocación.
