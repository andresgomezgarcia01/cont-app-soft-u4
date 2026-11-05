# ADR-0007: Lambda authorizer con llave compartida

**Estado:** Aprobada

## Contexto

La API solo debe atender peticiones con una llave válida, y la solución excluye el inicio de sesión y la gestión de usuarios. Además, ninguna credencial puede quedar en el repositorio ni en los archivos estáticos, y HTTP API no admite API keys (ADR-0003).

## Decisión

La función `authorizer` compara la cabecera `x-api-key` con la llave guardada, antes de invocar la función `api`. La compara con `hmac.compare_digest`, nunca la escribe en los logs y relee el parámetro cada 5 minutos; si no puede leerlo, lanza una excepción, de modo que no concede acceso y la interfaz no confunde el fallo con una llave inválida. API Gateway guarda su respuesta en caché durante 300 s por llave.

Terraform genera la llave con un recurso efímero (`ephemeral "random_password"`) y la escribe en un `SecureString` de Parameter Store (`/eds/dev/api-key`) con el argumento write-only `value_wo`, de modo que no queda en el estado ni en el repositorio. Para rotarla, se incrementa `api_key_version`. Quien usa el sitio escribe la llave al ingresar, y la interfaz la conserva solo durante la sesión del navegador.

Este control no autentica personas: la llave identifica a quien la tiene, no quién es. Es un control básico, proporcional a datos de solo lectura.

## Alternativas consideradas

- **API sin control:** no cumple el requisito de atender solo peticiones con una llave válida.
- **API key de REST API:** obligaría a cambiar de tipo de API, y AWS no las recomienda para autenticación.
- **Llave en los estáticos:** dejaría una credencial en los archivos que recibe el navegador.
- **Cognito con JWT:** agrega el inicio de sesión que la solución excluye.
- **Llave oculta detrás de un proxy:** agregaría un componente más, cuando el authorizer ya da el control sin credenciales en los estáticos y conserva HTTP API.

## Consecuencias

**Positivas**

- Hay control de acceso sin login y sin credenciales en los estáticos, y se conserva HTTP API.
- `api` no toca la llave, y una llave nueva se aplica sin desplegar.

**Negativas**

- La llave es compartida: si se filtra, da acceso de lectura. Se mitiga rotándola, aunque la anterior puede seguir válida hasta 5 minutos por la caché y hasta otros 5 por la relectura de la función.
- Se suma una función que mantener, y falta confirmar el código de respuesta ante una llave inválida (403 *(verificar el código en AWS)*), el descifrado que exige el parámetro *(verificar)* y el costo de su cifrado *(verificar)*.
