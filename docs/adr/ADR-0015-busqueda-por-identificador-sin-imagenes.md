
# ADR-0015: Búsqueda por identificador y sin imágenes

**Estado:** Aprobada

## Contexto

La interfaz debe permitir encontrar y consultar registros del catálogo. El dataset tiene un identificador único (`Volcano_Number`), mientras que `Volcano_Name` tiene 4 nombres repetidos. Además, incluye columnas con el enlace, la leyenda y el crédito de una foto (`Primary_Photo_*`).

La API ofrece dos operaciones de consulta: listado paginado de registros mediante `GET /items` y consulta individual por identificador mediante `GET /items/{id}`.

El frontend obtiene los registros mediante el listado paginado y realiza localmente la búsqueda por nombre, los filtros y la resolución del detalle de cada volcán a partir de los datos cargados. Actualmente, no utiliza `GET /items/{id}` para resolver los detalles individuales.

## Decisión

La API permite consultar el listado de registros y obtener un registro individual mediante su identificador exacto, con `GET /items/{id}`. No ofrece búsqueda por nombre ni búsqueda de texto libre o parcial.

El frontend realiza la búsqueda por nombre, los filtros y la consulta del detalle localmente sobre los registros obtenidos mediante el listado paginado. La operación `GET /items/{id}` está disponible en la API, pero no es utilizada actualmente por el frontend para resolver los detalles.

La interfaz no muestra imágenes ni enlaces de foto. Las columnas `Primary_Photo_*` se cargan como texto, para conservar el dataset completo.

## Alternativas consideradas

- **Búsqueda por nombre con índice secundario:** `Volcano_Name` tiene 4 nombres repetidos, y un índice dividiría la capacidad de escritura (ADR-0002).
- **Mostrar fotos desde el sitio de la fuente:** salvo indicación en la leyenda, GVP no garantiza el estado de copyright de las fotos, y la solución no las necesita (ver [fuente-de-datos.md](../fuente-de-datos.md)).

## Consecuencias

**Positivas**

- La tabla no necesita índices secundarios, y toda su capacidad queda disponible para la carga.
- El frontend permite buscar por nombre y aplicar filtros sin requerir operaciones adicionales de búsqueda en la API.
- La API conserva la capacidad de consultar individualmente un registro por su identificador.
- No hay que revisar los derechos de cada foto, y ninguna foto se separa de su crédito.

**Negativas**

- La búsqueda por nombre y los filtros se limitan a los registros cargados en el frontend; no son operaciones de búsqueda del lado del servidor.
- El frontend no utiliza actualmente `GET /items/{id}` para consultar los detalles individuales.
- Si un día se quisieran mostrar las fotos, habría que revisarlas una por una.
