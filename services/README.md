# Funciones

Código de las tres funciones Lambda y del módulo compartido. El diseño de cada una está en [docs/detalle/funciones.md](../docs/detalle/funciones.md).

| Carpeta | Runtime | Qué hace |
|---|---|---|
| `api/` | Node.js 24 | Atiende `GET /items` y `GET /items/{id}` según el [contrato](../contracts/openapi.yaml). |
| `loader/` | Node.js 24 | Se invoca al subir un CSV al bucket de ingesta, valida cada fila, la escribe en DynamoDB y deja un reporte de la carga. |
| `authorizer/` | Python 3.13 | Compara la cabecera `x-api-key` con la llave guardada en Parameter Store. |
| `common/` | | Módulo compartido por `api` y `loader`: configuración, errores, logs, respuestas, conversión de tipos y el contrato de esquema (`schema/volcanoes.schema.json`). |

## Estructura

En `api` y `loader`, `src/handler.mjs` traduce el evento de AWS, la lógica queda en los servicios, y el AWS SDK solo se usa en los repositorios. `loader` organiza la validación como una cadena de pasos en `src/chain/`. Las pruebas están en `test/` (Node.js) y `tests/` (Python).

`common` no es un paquete: `api` y `loader` lo importan siempre con ruta relativa (por ejemplo, `../../common/config.mjs`), y el empaquetado lo incluye en cada función.

## Validación local

No necesita credenciales de AWS. Es opcional, porque el pipeline `lambdas.yml` ejecuta lo mismo.

| Carpeta | Comandos |
|---|---|
| `api/`, `loader/`, `common/` | `npm ci`, `npm run lint` y `npm test` |
| `authorizer/` | `pip install -r requirements-dev.txt`, `ruff check` y `pytest` |

## Empaquetado y despliegue

`scripts/package-lambda.sh <función>` arma `dist/<función>.zip`. En `api` y `loader`, esbuild genera un solo `handler.mjs` con `common` y las dependencias de producción, entre ellas el AWS SDK; en `authorizer`, el ZIP lleva `src/handler.py`. `scripts/check-lambda-bundle.mjs` comprueba que el paquete carga sin `node_modules`.

Al integrar en `main`, `lambdas.yml` actualiza el código de las funciones. El detalle está en [docs/detalle/despliegue.md](../docs/detalle/despliegue.md#pipelines).
