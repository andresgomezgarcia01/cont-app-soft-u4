# Seguridad

Se aplican los controles básicos, proporcionales a una aplicación de solo lectura. La llave no autentica personas: identifica a quien la tiene ([ADR-0007](../adr/ADR-0007-lambda-authorizer-llave-compartida.md)).

## Permisos por rol

Cada función tiene su rol, y los tres pueden escribir en su propio grupo de logs. Ninguno registra la llave ([qué no se registra](logs.md#qué-no-se-registra)).

| Rol | Permisos |
|---|---|
| `authorizer` | `ssm:GetParameter` solo sobre `/eds/dev/api-key`, y el descifrado que exija el parámetro *(verificar)*. |
| `api` | `dynamodb:GetItem` y `dynamodb:Scan` sobre la tabla. Nada de escritura. |
| `loader` | `s3:GetObject` en `incoming/*`; `s3:PutObject` en `reports/*`; `dynamodb:BatchWriteItem` sobre la tabla. |
| `eds-github-deploy` | Lo asume GitHub Actions por OIDC, restringido al repositorio y a la rama `main`. Permisos limitados a los servicios usados y, donde el ARN lo permite, a los nombres `eds-*` y al parámetro `/eds/dev/*`, incluido el descifrado de ese parámetro. Sin llaves de acceso de larga duración. |

La invocación de `loader` se limita con un `aws_lambda_permission` que solo permite a S3 invocarla desde el ARN del bucket de ingesta.

Las tareas manuales (bootstrap, subir el CSV, verificar la carga y consultar la llave) las hace un operador con su propio acceso a la cuenta; no usan el rol de GitHub.

## Llave

- **Creación.** Terraform la genera con un recurso efímero (`ephemeral "random_password"`) y la escribe en un `SecureString` de Parameter Store con el argumento write-only `value_wo`, así que no queda en el estado ni en el repositorio.
- **Consulta.** `aws ssm get-parameter --with-decryption`.
- **Rotación.** Se incrementa `api_key_version` (`value_wo_version`). Al terminar el uso, se rota o se elimina.
- **Uso en la interfaz.** La conserva solo durante la sesión del navegador (UI-01, en [interfaz.md](interfaz.md)).

## Buckets

Ambos son privados, con bloqueo de acceso público y cifrado SSE-S3. El del sitio solo permite `s3:GetObject` a la distribución de CloudFront, mediante OAC y condición sobre su ARN.

## API y CORS

La etapa aplica throttling de 5 peticiones por segundo y ráfaga de 10 *(ajustable)*, y la función solo lee. Este límite es global y no por llave, así que un abuso puede saturarlo; se acepta porque el rol es de solo lectura, el Free plan no genera cobros y el ambiente se destruye al terminar.

El CORS permite los métodos `GET` y `OPTIONS` y la cabecera `x-api-key`, y admite cualquier origen por una variable de Terraform (`cors_allow_origins`), para facilitar el desarrollo local. Además, expone las cabeceras `x-request-id` y `apigw-requestid`, porque sin ello el navegador no deja leerlas al frontend, que está en otro dominio. No reemplaza la llave y, al no usar cookies, no expone sesiones. Se puede restringir al dominio de CloudFront al terminar.
