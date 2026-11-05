# ADR-0008: Contrato de esquema declarativo

**Estado:** Aprobada

## Contexto

La carga debe validar cada fila del CSV y conservar el tipo de cada columna: enteros y decimales como números, y texto como cadena. Para eso necesita saber qué columnas existen, de qué tipo son, cuáles son obligatorias y cuál es la clave primaria.

## Decisión

Esa información se define en un archivo JSON versionado en `services/common/schema/`, que indica el identificador del dataset, la clave primaria y, por cada columna, su nombre, su tipo (`string`, `integer` o `decimal`) y si es obligatoria. La carga valida con este contrato, y la API lo usa para devolver como `null` las columnas ausentes.

## Alternativas consideradas

- **Inferir los tipos a partir del CSV:** la inferencia es frágil (por ejemplo, un código con ceros a la izquierda se volvería número) y no deja trazabilidad.

## Consecuencias

**Positivas**

- Los tipos quedan explícitos y versionados junto al código, lo que da trazabilidad.
- Una fila que no cumple el contrato se rechaza con un código de error concreto (por ejemplo, `TYPE_CAST_FAILED`), en lugar de cargarse con un tipo incorrecto.

**Negativas**

- El encabezado del CSV debe coincidir con las columnas del contrato. Si no coincide, la carga se detiene con `HEADER_MISMATCH`, de modo que un cambio de columnas en la fuente exige actualizar el contrato.
- El contrato se empaqueta en el ZIP de `api` y `loader`, así que cambiarlo requiere desplegar ambas funciones.
