# Registros de decisiones de arquitectura (ADR)

Esta carpeta reúne las decisiones de arquitectura del Explorador de Datos Serverless. Cada ADR explica una decisión tal como está hoy: qué problema resuelve, qué se eligió, qué se descartó y por qué, y qué consecuencias se aceptan. De este modo, quien llega al proyecto entiende el motivo de cada elección sin tener que reconstruirlo a partir del código.

## Índice

| Número | Título | Estado |
|---|---|---|
| [ADR-0001](ADR-0001-funciones-empaquetadas-zip.md) | Funciones empaquetadas como ZIP | Aprobada |
| [ADR-0002](ADR-0002-dynamodb-aprovisionado.md) | DynamoDB aprovisionado con carga a ritmo limitado | Aprobada |
| [ADR-0003](ADR-0003-api-gateway-http-api.md) | API Gateway HTTP API | Aprobada |
| [ADR-0004](ADR-0004-funcion-por-microservicio.md) | Una función por microservicio y `authorizer` aparte | Aprobada |
| [ADR-0005](ADR-0005-cloudfront-bucket-privado.md) | CloudFront de pago por uso con bucket privado | Aprobada |
| [ADR-0006](ADR-0006-ingesta-s3-lambda-asincrona.md) | Ingesta de S3 a Lambda asíncrona | Aprobada |
| [ADR-0007](ADR-0007-lambda-authorizer-llave-compartida.md) | Lambda authorizer con llave compartida | Aprobada |
| [ADR-0008](ADR-0008-contrato-de-esquema.md) | Contrato de esquema declarativo | Aprobada |
| [ADR-0009](ADR-0009-contract-first-openapi.md) | Contract-first con OpenAPI y frontend contra la API desplegada | Aprobada |
| [ADR-0010](ADR-0010-region-us-east-2.md) | Región us-east-2 | Aprobada |
| [ADR-0011](ADR-0011-dataset-holocene-volcanoes.md) | Dataset Holocene Volcanoes del Smithsonian | Aprobada |
| [ADR-0012](ADR-0012-pipelines-github-actions-oidc.md) | Tres pipelines en GitHub Actions con OIDC | Aprobada |
| [ADR-0013](ADR-0013-pruebas-locales-sin-emuladores.md) | Pruebas locales sin credenciales ni emuladores | Aprobada |
| [ADR-0014](ADR-0014-agregados-precalculados.md) | Agregados del panel precalculados por la carga | Descartada |
| [ADR-0015](ADR-0015-busqueda-por-identificador-sin-imagenes.md) | Búsqueda por identificador y sin imágenes | Aprobada |
| [ADR-0016](ADR-0016-lenguajes-de-las-funciones.md) | Node.js en `api` y `loader`, y Python en `authorizer` | Aprobada |

## Estados

- **Propuesta:** la decisión está planteada y el diseño la asume, pero falta confirmarla.
- **Aprobada:** la decisión está vigente.
- **Reemplazada:** otra decisión la sustituyó; el ADR indica cuál.
- **Descartada:** se evaluó y no se implementa; el ADR indica por qué.

## Cómo agregar un ADR

1. Toma el siguiente número libre del índice. Los números no se reutilizan.
2. Crea el archivo `ADR-NNNN-titulo-corto.md` en esta carpeta, con la plantilla de abajo. Procura que tenga menos de 40 líneas.
3. Escribe la decisión tal como está hoy, no la historia de cómo se llegó a ella. Por cada alternativa, indica por qué se descartó.
4. Agrega la fila al índice de este archivo y propón el cambio por pull request.

Un ajuste a una decisión aprobada se edita en el mismo ADR. Si la decisión cambia de fondo, se crea uno nuevo y el anterior pasa a **Reemplazada**, con el enlace al que lo sustituye.

```markdown
# ADR-NNNN: Título

**Estado:** Propuesta

## Contexto

Qué problema se resuelve y qué condiciones limitan la decisión.

## Decisión

Qué se eligió y cómo se aplica.

## Alternativas consideradas

- **Alternativa:** por qué se descartó.

## Consecuencias

**Positivas**

- ...

**Negativas**

- ...
```
