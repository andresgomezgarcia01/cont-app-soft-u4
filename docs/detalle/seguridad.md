# Seguridad

Se aplican los controles básicos, proporcionales a una aplicación de solo lectura. La llave no autentica personas: identifica a quien la tiene ([ADR-0007](../adr/ADR-0007-lambda-authorizer-llave-compartida.md)).

## Permisos por rol

Cada función tiene su rol, y los tres pueden escribir en su propio grupo de logs. Ninguno registra la llave ([qué no se registra](logs.md#qué-no-se-registra)).

| Rol | Permisos |
|---|---|
| `authorizer` | `ssm:GetParameter` solo sobre `/eds/dev/api-key`, y el descifrado que exija el parámetro *(verificar)*. |
| `api` | `dynamodb:GetItem` y `dynamodb:Scan` sobre la tabla. Nada de escritura. |
| `loader` | `s3:GetObject` en `incoming/*`; `s3:PutObject` en `reports/*`; `dynamodb:BatchWriteItem` sobre la tabla. |
| `eds-github-deploy` | Usuario IAM sin acceso a la consola. GitHub Actions usa su llave, guardada en los secretos del Environment `aws`, limitado a la rama `main`. Permisos limitados a los servicios usados y, donde el ARN lo permite, a los nombres `eds-dev-*` y al parámetro `/eds/dev/*`, incluido el descifrado de ese parámetro. Sobre el bucket de estado `eds-tfstate-<account_id>` solo puede listar el bucket, leer y escribir objetos, y borrar únicamente el bloqueo `*.tflock`. Así, el usuario no puede modificar sus propios permisos ni borrar ese bucket de forma directa. |

La invocación de `loader` se limita con un `aws_lambda_permission` que solo permite a S3 invocarla desde el ARN del bucket de ingesta.

Las tareas manuales (bootstrap, subir el CSV, verificar la carga y consultar la llave) las hace un operador con su propio acceso a la cuenta; no usan el usuario de GitHub.

### Riesgo aceptado del usuario de despliegue

La llave de `eds-github-deploy` es de larga duración, porque la SCP de la cuenta impide usar OIDC ([ADR-0012](../adr/ADR-0012-pipelines-github-actions.md)). Si se filtra, sirve fuera de GitHub hasta que se desactive, y la restricción a `main` la aplica GitHub, no AWS. Con ella se puede cambiar el sitio y el código de las funciones, borrar la tabla, alterar el estado de Terraform y leer la llave de la API. Además, el usuario puede crear roles `eds-dev-*` con cualquier política en línea, y no se usa un permissions boundary, de modo que quien tenga la llave o pueda escribir en `main` podría obtener permisos de administrador de la cuenta de forma indirecta. Por otra parte, el Environment `aws` limita la rama, pero no exige revisores, y el pull request de `main` no exige aprobaciones. Por lo tanto, cualquiera con permiso de escritura en el repositorio puede integrar sus propios cambios y lanzar desde `main` las acciones `destroy` o `recreate-table` de `infra.yml`, que se ejecutan sin pausa. Se acepta porque es un ambiente temporal con datos públicos, que se recrea con Terraform y cuya carga se repite. Para acotar el riesgo, se protege `main` exigiendo pull requests ([configuración](despliegue.md#configuración-en-github)) y, al terminar, la llave se desactiva y se borra.

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
