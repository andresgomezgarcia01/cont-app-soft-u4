# ADR-0004: Una función por microservicio y `authorizer` aparte

**Estado:** Aprobada

## Contexto

Un microservicio serverless puede estar formado por una o varias funciones, de modo que hay que definir dónde se traza el límite. La solución tiene dos responsabilidades claras: consultar los datos, con dos lecturas pequeñas que comparten ciclo de vida, y cargarlos, con un proceso ocasional que se dispara por evento. Además, el control de acceso debe leer la llave.

## Decisión

La responsabilidad se separa por microservicio, no por ruta:

- **Consulta:** la función `api` atiende las dos rutas con un enrutador interno, un objeto `routeKey -> función`.
- **Ingesta:** la función `loader` procesa cada archivo que llega.

Cada una tiene su disparador, sus permisos y su ciclo de vida. El control de acceso va aparte, en la función `authorizer`, para que `api` no toque la llave.

## Alternativas consideradas

- **Una función por ruta:** multiplica la configuración sin beneficio, porque las dos operaciones son lecturas pequeñas con el mismo ciclo de vida y el rol sigue siendo de solo lectura.

## Consecuencias

**Positivas**

- Hay menos funciones, roles y grupos de logs que mantener.
- Una sola función de API se mantiene caliente con más frecuencia que dos funciones separadas.
- El rol de `api` no tiene acceso a la llave, y cada función conserva su propio rol con permisos mínimos.

**Negativas**

- Las dos rutas comparten memoria (256 MB), timeout (10 s) y rol, así que no se pueden ajustar por separado.
- El handler de `api` debe mantener el enrutador, algo que API Gateway resolvería con una función por ruta.
