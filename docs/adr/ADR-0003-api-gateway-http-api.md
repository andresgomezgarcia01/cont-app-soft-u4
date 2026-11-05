# ADR-0003: API Gateway HTTP API

**Estado:** Aprobada

## Contexto

La interfaz web consume una API de solo lectura con dos rutas: `GET /items` y `GET /items/{id}`. Esa API debe enrutar las peticiones, manejar CORS, aplicar límites de tasa y exigir una llave de acceso, con el menor costo y la menor complejidad posibles.

## Decisión

Se usa API Gateway en su modalidad HTTP API. Admite el Lambda authorizer que aplica el control de acceso (ADR-0007) y aplica throttling por etapa: 5 peticiones por segundo y ráfaga de 10 *(ajustable)*.

## Alternativas consideradas

- **REST API:** es menos simple y más costosa. Lo que ofrece de más (respuestas de gateway personalizadas, API keys y validación) no compensa aquí: la llave se resuelve con un Lambda authorizer (ADR-0007).
- **Lambda Function URLs:** no dan enrutamiento ni throttling.

## Consecuencias

**Positivas**

- Es el tipo de API más simple y económico: a 1 USD por millón de llamadas, el consumo esperado de miles de llamadas cuesta menos de 1 centavo.
- CORS, rutas y throttling se resuelven en el gateway, sin código adicional en las funciones.

**Negativas**

- HTTP API no permite personalizar las respuestas que genera el propio gateway, y estas no llevan `x-request-id`. Por lo tanto, el cliente decide primero por el código HTTP y, solo si existe, refina con `error.code`.
- El throttling es global y no por llave, así que un abuso puede saturar el límite. Lo acotan el rol de solo lectura y el hecho de que el Free plan no genera cobros.
- HTTP API no admite API keys, de modo que el control de acceso requiere una función aparte (ADR-0007).
