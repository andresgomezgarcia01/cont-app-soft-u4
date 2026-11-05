# ADR-0012: Tres pipelines en GitHub Actions con llave de usuario IAM

**Estado:** Aprobada

## Contexto

La infraestructura, las funciones y el sitio web cambian a ritmos distintos y los trabajan personas distintas. Cada una debe poder desplegar desde el repositorio, sin configurar credenciales de AWS en su equipo. La solución se despliega en una cuenta de proyecto de AWS, cuya política de control de servicios (SCP) niega `iam:*Provider*` y no se puede modificar, de modo que no permite crear un proveedor OIDC.

## Decisión

Se trabaja por pull request, con tres pipelines de GitHub Actions: `infra.yml` (infraestructura), `lambdas.yml` (funciones) y `web.yml` (sitio web). Cada uno se dispara cuando cambia su carpeta o de forma manual (`workflow_dispatch`). En un pull request se valida sin credenciales; en `main`, además, se despliega. Para desplegar, los jobs declaran `environment: aws` y usan la llave de acceso del usuario IAM `eds-github-deploy`, guardada en los secretos de ese Environment, que está limitado a la rama `main`.

## Alternativas consideradas

- **OIDC:** evitaría una llave de larga duración, pero la SCP de la cuenta impide crear el proveedor, y usarlo exigiría cambiar de cuenta.
- **Un solo pipeline con filtros por ruta:** es posible, pero separarlos simplifica los disparadores y deja más claro qué despliega cada uno.
- **Despliegue manual:** requiere credenciales locales en el equipo de cada persona.

## Consecuencias

**Positivas**

- Cada parte se despliega por separado, sin credenciales locales.
- Las validaciones locales son opcionales, porque el pipeline ejecuta las mismas.
- Con un repositorio público, los runners estándar no tienen costo.

**Negativas**

- La llave es de larga duración: si se filtra, sirve fuera de GitHub hasta que se desactive. La restricción a `main` la aplica GitHub, no AWS ([riesgo aceptado](../detalle/seguridad.md#riesgo-aceptado-del-usuario-de-despliegue)).
- Lo que debe existir antes de desplegar (bucket de estado y usuario IAM con su política) lo crea una vez `scripts/bootstrap.sh`, con credenciales temporales de administrador. La llave del usuario se crea aparte, con un comando que la guarda en los secretos de GitHub.
- El primer despliegue se ejecuta a mano y en orden: `infra.yml`, `lambdas.yml` y `web.yml`.
- Las tareas manuales (bootstrap, subir el CSV, verificar la carga y consultar la llave de la API) las hace un operador con su propio acceso a la cuenta: no usan el usuario de GitHub.
