# ADR-0002: DynamoDB aprovisionado con carga a ritmo limitado

**Estado:** Aprobada

## Contexto

La solución necesita una base de datos serverless con costo cercano a cero para un dataset de 1 214 registros (ítems de 1,8 KB en promedio). Cada carga consume unas 2 650 WCU *(estimado; verificar en la carga real)*, y el volumen de consultas es bajo.

## Decisión

Se usa una sola tabla de DynamoDB en modo `PROVISIONED`, con 25 WCU y 25 RCU y sin autoescalado. La carga la hace la función `loader`, que regula su propio ritmo: agrupa lotes de 10 ítems, pide la capacidad consumida (`ReturnConsumedCapacity=TOTAL`) y espera lo necesario para mantenerse en 20 WCU/s, un margen bajo las 25 aprovisionadas. Ese ritmo llega por la variable `WRITE_RATE_WCU`. Con este consumo, la carga toma entre 2 y 3 minutos *(verificar)*.

## Alternativas consideradas

- **DynamoDB bajo demanda:** la capa gratuita no cubre este modo.
- **Aurora Serverless v2:** exige VPC y tiene costo por capacidad.
- **Importación nativa desde S3:** crea una tabla nueva, cobra por GB y, con CSV, no conserva los tipos de datos.

## Consecuencias

**Positivas**

- La capacidad entra en la capa gratuita (25 WCU, 25 RCU y 25 GB, por región y por cuenta).
- El throttling durante la carga es la excepción, no el mecanismo de control.
- Con 20 WCU/s y un timeout de 300 s *(verificar en la carga real)*, una carga admite hasta unas 4 800 WCU, con 60 s de margen.

**Negativas**

- La capacidad gratuita es por región y por cuenta, de modo que no debe haber otras tablas aprovisionadas en la región.
- Dos cargas simultáneas o un evento duplicado suman el ritmo de escritura y pueden superar las 25 WCU. Por eso se sube un archivo a la vez; si ocurre, los reintentos y la idempotencia protegen el resultado.
- Varias peticiones seguidas con `limit=100` superan las 25 RCU y producen `503 DEPENDENCY_UNAVAILABLE`. Se acepta para este volumen; para una tabla bastan páginas de 25 registros.
- La carga sobrescribe por clave primaria, pero no borra. Antes de una carga que deba quedar exacta, hay que recrear la tabla.
