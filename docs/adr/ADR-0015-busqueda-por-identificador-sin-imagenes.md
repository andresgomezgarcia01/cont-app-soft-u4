# ADR-0015: Búsqueda por identificador y sin imágenes

**Estado:** Aprobada

## Contexto

La interfaz debe permitir encontrar un registro concreto del catálogo. El dataset tiene un identificador único (`Volcano_Number`), mientras que `Volcano_Name` tiene 4 nombres repetidos. Además, incluye columnas con el enlace, la leyenda y el crédito de una foto (`Primary_Photo_*`).

## Decisión

La búsqueda es solo por identificador exacto, con `GET /items/{id}`. La interfaz no muestra imágenes ni enlaces de foto. Con todo, las columnas `Primary_Photo_*` se cargan como texto, para conservar el dataset completo.

## Alternativas consideradas

- **Búsqueda por nombre con índice secundario:** `Volcano_Name` tiene 4 nombres repetidos, y un índice dividiría la capacidad de escritura (ADR-0002).
- **Mostrar fotos desde el sitio de la fuente:** salvo indicación en la leyenda, GVP no garantiza el estado de copyright de las fotos, y la solución no las necesita (ver [fuente-de-datos.md](../fuente-de-datos.md)).

## Consecuencias

**Positivas**

- La tabla no necesita índices secundarios, y toda su capacidad queda disponible para la carga.
- No hay que revisar los derechos de cada foto, y ninguna foto se separa de su crédito.

**Negativas**

- No hay búsqueda por nombre, de texto libre ni parcial: quien usa el sitio debe conocer el identificador o encontrarlo en la tabla paginada.
- Si un día se quisieran mostrar las fotos, habría que revisarlas una por una.
