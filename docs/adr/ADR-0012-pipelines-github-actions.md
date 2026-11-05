# ADR-0012: Tres pipelines en GitHub Actions con llave de usuario IAM

**Estado:** Aprobada

## Contexto

La infraestructura, las funciones y el sitio web cambian a ritmos distintos y los trabajan personas distintas. Cada una debe poder desplegar desde el repositorio, sin configurar credenciales de AWS en su equipo. La solución se despliega en una cuenta de proyecto de AWS, cuya política de control de servicios (SCP) niega `iam:*Provider*` y no se puede modificar, de modo que no permite crear un proveedor OIDC.

## Decisión

Se trabaja por pull request, con tres pipelines de GitHub Actions: `infra.yml` (infraestructura), `lambdas.yml` (funciones) y `web.yml` (sitio web). Cada uno se dispara cuando cambia su carpeta o de forma manual (`workflow_dispatch`). En un pull request se valida sin credenciales. Un push a `main` despliega con `lambdas.yml` y `web.yml`.

`infra.yml`, en cambio, no aplica al recibir un push: valida y ejecuta `terraform plan`. Para aplicar, se lanza a mano desde `main` con el parámetro `action`: `apply`, `recreate-table` (limitada a la tabla con `-replace` y `-target`) o `destroy`. Cada acción guarda un plan y aplica ese plan, sin pausa entre ambos: el plan queda como registro en el log, y el control es revisar el plan del push antes de lanzar la acción manual. Un lanzamiento manual desde otra rama solo valida.

Los jobs que usan AWS, incluido el job `terraform` de `infra.yml` al solo planear, declaran `environment: aws` y usan la llave de acceso del usuario IAM `eds-github-deploy`, guardada en los secretos de ese Environment, que está limitado a la rama `main`.

## Alternativas consideradas

- **OIDC:** evitaría una llave de larga duración, pero la SCP de la cuenta impide crear el proveedor, y usarlo exigiría cambiar de cuenta.
- **Un solo pipeline con filtros por ruta:** es posible, pero separarlos simplifica los disparadores y deja más claro qué despliega cada uno.
- **Despliegue desde el equipo de cada persona:** requiere credenciales locales.
- **Plan en el pull request con un usuario IAM de solo lectura:** exige otro usuario, otra política y otra llave, además de volver a correr el bootstrap, sin justificarse en un ambiente temporal.
- **Plan en el pull request con la llave de despliegue:** un pull request ejecuta el código de su rama, y quitar el límite a `main` expondría una llave con la que se puede escalar a administrador.
- **Apply automático al integrar en `main`:** no permite revisar el plan antes de aplicar.

## Consecuencias

**Positivas**

- Cada parte se despliega por separado, sin credenciales locales.
- Las validaciones locales son opcionales, porque el pipeline ejecuta las mismas.
- Con un repositorio público, los runners estándar no tienen costo.
- El plan del push se revisa antes de aplicar: si muestra algo indeseado, AWS sigue intacto y se corrige con otro pull request.
- La llave de despliegue no queda al alcance del código de un pull request.

**Negativas**

- La llave es de larga duración: si se filtra, sirve fuera de GitHub hasta que se desactive. La restricción a `main` la aplica GitHub, no AWS ([riesgo aceptado](../detalle/seguridad.md#riesgo-aceptado-del-usuario-de-despliegue)).
- Lo que debe existir antes de desplegar (bucket de estado y usuario IAM con su política) lo crea una vez `scripts/bootstrap.sh`, con credenciales temporales de administrador. La llave del usuario se crea aparte, con un comando que la guarda en los secretos de GitHub.
- Un cambio en `infra/` integrado en `main` no se despliega hasta lanzar `apply`, y `main` puede quedar por delante de lo desplegado.
- El pull request no incluye un plan, así que los errores que solo aparecen al planear se ven después de integrar.
- El plan del push no anticipa `recreate-table` ni `destroy`, y cada acción calcula su propio plan, que puede diferir del revisado si AWS o `main` cambiaron entretanto.
- El primer despliegue se ejecuta a mano y en orden: `infra.yml` con la acción `apply`, `lambdas.yml` y `web.yml`.
- Las tareas manuales (bootstrap, subir el CSV, verificar la carga y consultar la llave de la API) las hace un operador con su propio acceso a la cuenta: no usan el usuario de GitHub.
