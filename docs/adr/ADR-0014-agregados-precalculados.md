# ADR-0014: Agregados del panel precalculados por la carga

**Estado:** Descartada

## Contexto

La interfaz podía mostrar un panel con agregados de todo el conjunto de datos. Calcularlos en cada visita recorriendo la tabla cuesta unas 270 RCU, frente a las 25 por segundo disponibles (ADR-0002). Por eso se evaluó que la función `loader` los calculara durante la carga y los guardara en S3, y que la función `api` los expusiera con una ruta adicional.

## Decisión

No se implementa. La carga no calcula agregados y la API no tiene una ruta para ellos, porque el panel no es un requisito de la solución y esto simplifica las dos funciones, sus permisos y el contrato.

## Alternativas consideradas

- **Agregados precalculados por la carga:** el panel no consumiría capacidad de la tabla, a cambio de más código, un archivo más en S3, una ruta más y permisos de S3 para `api`.

## Consecuencias

**Positivas**

- `api` solo necesita permisos sobre DynamoDB, y `loader` solo escribe el reporte en S3.
- Cambiar de dataset ya no obliga a cambiar un cálculo de agregados.

**Negativas**

- Un resumen de todo el catálogo se debe calcular en la interfaz, recorriendo las páginas en secuencia. Tarda unos segundos y consume capacidad de lectura ([interfaz](../detalle/interfaz.md#qué-conviene-saber)).
