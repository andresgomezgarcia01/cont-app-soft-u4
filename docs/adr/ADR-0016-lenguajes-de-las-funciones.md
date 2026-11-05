# ADR-0016: Node.js en `api` y `loader`, y Python en `authorizer`

**Estado:** Aprobada

## Contexto

Quien implementa la interfaz con React también implementa las funciones `api` y `loader`, y trabaja con Node.js. La función `authorizer` la implementa otra persona, y es un solo archivo pequeño. Lambda permite elegir el runtime por función.

## Decisión

`api` y `loader` usan Node.js 24 (`nodejs24.x`), con JavaScript y módulos ES, y comparten `services/common`. `authorizer` usa Python 3.13 (`python3.13`). Ambos runtimes tienen soporte de AWS más allá del periodo de uso de la solución.

## Alternativas consideradas

- **Todas en Python:** evitaría dos cadenas de herramientas, pero obligaría a implementar `api` y `loader` en un lenguaje distinto al de quien las desarrolla.
- **Todas en Node.js:** daría un solo lenguaje, pero no aporta nada a una función tan pequeña como `authorizer`, que no comparte código con las demás.

## Consecuencias

**Positivas**

- Cada función la desarrolla quien conoce su lenguaje, y el frontend y las funciones de datos comparten lenguaje.
- El contrato de esquema y el de la API son archivos independientes del lenguaje.

**Negativas**

- `lambdas.yml` valida con dos cadenas de herramientas: `npm` en `api`, `loader` y `common`, y `ruff` y `pytest` en `authorizer`.
- Node.js no incluye un lector de CSV, así que `loader` depende de `csv-parse`.
- Los decimales no pasan por `Number`: se validan como texto y se envían así a DynamoDB, para conservar su precisión.
- Con el formato JSON de Lambda, `console.log` deja los objetos dentro de `message`, así que `api` y `loader` escriben sus logs con un ayudante común ([logs](../detalle/logs.md)).
