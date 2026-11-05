# ADR-0006: Ingesta de S3 a Lambda asíncrona

**Estado:** Aprobada

## Contexto

Un archivo CSV llega de vez en cuando al bucket de ingesta y debe cargarse sin intervención. Un fallo transitorio debe reintentarse, y un fallo persistente debe poder identificarse y repetirse.

## Decisión

S3 notifica a la función `loader` con un evento `ObjectCreated` cuando llega un objeto `.csv` a `incoming/`, lo que invoca la función de forma asíncrona. Lambda guarda el evento en su cola interna y, si la ejecución falla, la reintenta hasta 2 veces, con esperas de 1 y 2 minutos (`maximum_retry_attempts = 2`, `maximum_event_age_in_seconds = 3600`). Si sigue fallando, descarta el evento. El fallo queda en el reporte de la carga o en los logs, y el archivo sigue en `incoming/`, de modo que la carga se repite volviendo a subirlo.

## Alternativas consideradas

- **Destino de fallo en una cola SQS:** conservaría el evento original y el error durante 14 días, sin revisar los logs. Se deja fuera del alcance para simplificar la solución, porque el archivo se conserva en S3 y las cargas son ocasionales y las hace un operador.
- **S3, SQS y Lambda con event source mapping y DLQ:** solo aportaría control del ritmo de consumo, que no se necesita con cargas ocasionales. A cambio, exige una cola más y ajustar la visibilidad (el *visibility timeout* debe ser al menos seis veces el timeout de la función), además de descartar el mensaje `s3:TestEvent`.
- **EventBridge:** agregaría un servicio intermedio sin necesidad, porque la notificación directa de S3 ya da el disparo por evento que se requiere.

## Consecuencias

**Positivas**

- Se obtienen reintentos automáticos sin administrar ninguna cola.
- La notificación solo escucha `incoming/` y los resultados se escriben en `reports/`, de modo que la función nunca se dispara a sí misma.

**Negativas**

- No se pueden ver mensajes pendientes, pausar el procesamiento ni reintentar más de 2 veces.
- S3 entrega eventos al menos una vez y Lambda puede reintentar, así que la escritura debe ser idempotente. Se logra escribiendo cada registro con su clave primaria.
- El reproceso es manual: se vuelve a subir el archivo.
- Si la función muere sin escribir su reporte (timeout o memoria) y se agotan los reintentos, el fallo solo queda en los logs. Por eso, después de cada carga se comprueba que exista el reporte.
- Los errores de contenido (`ENCODING_ERROR`, `HEADER_MISMATCH` y `FILE_TOO_LARGE`) y `TIME_LIMIT_REACHED` no ocupan los reintentos: solo quedan en el reporte de la carga.
