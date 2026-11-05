# Reglas de proyecto

Estas convenciones aplican a cualquier persona, use o no inteligencia artificial.

## Comentarios en el código

1. Un comentario explica **por qué**, no **qué**. Si el código necesita un comentario para entender qué hace, primero se intenta un mejor nombre o una función más pequeña.
2. Sin redundancia: un comentario no repite lo que el código ya dice.
3. Una línea por comentario como norma. Un bloque de varias líneas solo cuando hay una restricción no evidente (por ejemplo, un límite de AWS o un caso borde del dataset).
4. Sin referencias a peticiones, tareas, historias, features, tickets, sprints ni conversaciones. El código debe entenderse sin acceso a ningún tablero ni historial de trabajo.
5. Sin historial de cambios: un comentario describe el código tal como está, no qué se agregó o cambió ni cuándo. Eso queda en los commits.
6. Sin código comentado. Lo que no se usa se borra; para eso existe el historial de git.
7. Comentarios de documentación solo en funciones y clases públicas de `service.mjs`, `repository.mjs` y `common/`, en una línea cuando sea posible.

## Código

1. Node.js (`api`, `loader` y `common`): módulos ES con extensión `.mjs`, `npm run lint` y `npm test`, con `node:test`.
2. Python (`authorizer`): `ruff` para lint y formato, tipado en firmas públicas y `pytest` para pruebas.
3. Respetar las capas definidas en la arquitectura: el handler no tiene lógica de negocio y solo `repository.mjs` usa el AWS SDK. La excepción es `authorizer`, que es un solo archivo.
4. Nombres de recursos, tablas y buckets solo desde variables de entorno.
5. Terraform: `terraform fmt`, variables con `description` y `type`, sin valores fijos de cuenta o región en el código (el bucket del backend se pasa con `-backend-config`).

## Documentación

1. El `README.md` raíz responde, en este orden: qué es, alcance, arquitectura en una imagen, requisitos, ejecución local, despliegue en AWS, carga y verificación de datos, destrucción del ambiente, fuente de los datos, mapa de documentación.
2. Cada carpeta principal (`frontend/`, `infra/`, `services/`) tiene un `README.md` corto con cómo se ejecuta y se prueba esa parte.
3. La documentación describe la solución tal como está, no la historia de cómo se construyó.
4. Diagramas en Mermaid, dentro del Markdown.

## Ramas y commits

1. `main` siempre desplegable; cambios por rama y pull request.
2. Commits con Conventional Commits (`feat:`, `fix:`, `docs:`, `infra:`, `test:`, `chore:`), en imperativo y en español.
