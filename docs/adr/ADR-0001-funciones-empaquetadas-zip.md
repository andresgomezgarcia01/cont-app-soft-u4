# ADR-0001: Funciones empaquetadas como ZIP

**Estado:** Aprobada

## Contexto

La solución tiene tres funciones Lambda: `api` y `loader` en Node.js 24, y `authorizer` en Python 3.13 (ADR-0016). Usan el AWS SDK incluido en cada runtime, y la única dependencia externa es `csv-parse`, en `loader`. Hay que definir cómo se empaquetan y quién despliega su código, de modo que la infraestructura y las funciones puedan cambiar por separado.

## Decisión

Las funciones se empaquetan como ZIP. Terraform las crea con un ZIP provisional por lenguaje (`archive_file` sobre `placeholder/`) que siempre lanza una excepción, e ignora los cambios posteriores de su código (`ignore_changes`). Por su parte, el pipeline `lambdas.yml` despliega el código real: un script arma cada ZIP con `services/<función>/src` y, en `api` y `loader`, agrega `services/common` y sus dependencias de producción.

## Alternativas consideradas

- **Imágenes de contenedor en ECR:** exigen un registro y construir imágenes. Solo aportarían probar el mismo artefacto en local, y esa necesidad ya se cubre con las pruebas locales (ADR-0013).
- **Código real con `archive_file` en Terraform:** ataría el despliegue del código al de la infraestructura e impediría tener un pipeline propio para las funciones.

## Consecuencias

**Positivas**

- No hay registro de imágenes ni construcción de imágenes que mantener.
- La infraestructura y las funciones se despliegan por separado (ADR-0012).
- El código provisional no concede acceso.

**Negativas**

- Si Terraform recrea una función, vuelve el código provisional y hay que ejecutar `lambdas.yml` otra vez.
- Las funciones no quedan operativas con el primer `terraform apply`: hace falta ejecutar después `lambdas.yml`.
- Las pruebas locales no ejecutan el mismo artefacto que corre en Lambda.
- Un CSV subido antes de desplegar el código real se reintenta y se descarta, así que hay que volver a subirlo.
- AWS recomienda empaquetar el SDK para controlar su versión. Se usa el del runtime, por simplicidad, y a cambio su versión puede cambiar con las actualizaciones del runtime.
