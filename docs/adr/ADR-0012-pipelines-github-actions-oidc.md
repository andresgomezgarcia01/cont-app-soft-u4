# ADR-0012: Tres pipelines en GitHub Actions con OIDC

**Estado:** Aprobada

## Contexto

La infraestructura, las funciones y el sitio web cambian a ritmos distintos y los trabajan personas distintas. Cada una debe poder desplegar desde el repositorio, sin configurar credenciales de AWS en su equipo y sin que la automatización guarde llaves de larga duración.

## Decisión

Se trabaja por pull request, con tres pipelines de GitHub Actions: `infra.yml` (infraestructura), `lambdas.yml` (funciones) y `web.yml` (sitio web). Cada uno se dispara cuando cambia su carpeta o de forma manual (`workflow_dispatch`). En un pull request se valida sin credenciales; en `main`, además, se despliega. Para desplegar, GitHub Actions asume un rol por OIDC restringido al repositorio y a la rama `main`.

## Alternativas consideradas

- **Un solo pipeline con filtros por ruta:** es posible, pero separarlos simplifica los disparadores y deja más claro qué despliega cada uno.
- **Despliegue manual:** requiere credenciales locales en el equipo de cada persona.

## Consecuencias

**Positivas**

- Cada parte se despliega por separado, sin credenciales locales y sin llaves de larga duración.
- Las validaciones locales son opcionales, porque el pipeline ejecuta las mismas.
- Con un repositorio público, los runners estándar no tienen costo.

**Negativas**

- Lo que debe existir antes de desplegar (bucket de estado, proveedor OIDC y rol) lo crea una vez `scripts/bootstrap.sh`, con credenciales temporales de administrador.
- El primer despliegue se ejecuta a mano y en orden: `infra.yml`, `lambdas.yml` y `web.yml`.
- Las tareas manuales (bootstrap, subir el CSV, verificar la carga y consultar la llave) las hace un operador con su propio acceso a la cuenta: no usan el rol de GitHub.
