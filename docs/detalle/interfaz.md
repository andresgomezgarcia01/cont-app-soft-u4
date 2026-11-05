# Requisitos de la interfaz web

Son los mínimos que debe cumplir, sin importar cómo se presente. Las vistas, el diseño y las librerías quedan a criterio de quien la desarrolle. Los datos y sus códigos de error vienen de [openapi.yaml](../../contracts/openapi.yaml).

| Id | Requisito |
|---|---|
| UI-01 | Pedir la llave al ingresar y no mostrar las demás vistas sin ella. Enviarla en `x-api-key` en cada petición y conservarla solo en `sessionStorage`. Nunca escribirla en el código ni en los estáticos. |
| UI-02 | Ante un 401 o 403, borrar la llave guardada y volver a pedirla. Si esos errores llegan sin cabeceras CORS, el navegador los muestra como fallo de red, así que un fallo de red en cualquier petición ofrece volver a la pantalla de llave. |
| UI-03 | Recibir la URL base de la API en la variable de entorno `VITE_API_BASE_URL` al compilar, nunca fija en el código. |
| UI-04 | Tener los scripts `npm run lint` y `npm run build`, y compilar a estáticos en `dist/`, con `index.html` en la raíz. Los usa el [pipeline](despliegue.md#pipelines). |
| UI-05 | Mostrar los datos en tablas, gráficas o tarjetas, y permitir buscar un registro por `Volcano_Number`. |
| UI-06 | Citar la fuente: "Global Volcanism Program, Smithsonian Institution", con enlace a `https://volcano.si.edu`, junto con la cita formal de la base de datos que se registre en [fuente-de-datos.md](../fuente-de-datos.md). |
| UI-07 | Manejar los estados de carga, vacío y error. Para los errores, decidir por código HTTP y refinar con `error.code` cuando exista ([catálogo](errores.md#errores-de-la-api)). Mostrar el `request_id` en los errores inesperados (5xx): el del cuerpo o, si no viene, el de la cabecera `x-request-id` o `apigw-requestid`. |

Las rutas de la SPA funcionan directamente: CloudFront devuelve `index.html` para los errores 403 y 404 del bucket. No afecta a la API, porque esta no pasa por CloudFront.

El [desarrollo local](pruebas.md#desarrollo-del-frontend) se hace contra la API desplegada.

## Qué conviene saber

No son requisitos, pero evitan errores frecuentes con estos datos:

- **Resúmenes y gráficos.** La API no entrega agregados. Para calcularlos sobre todo el catálogo hay que recorrerlo: unas 13 páginas con `limit=100` y unas 270 RCU en total *(estimado)*. Conviene pedirlas una tras otra, a razón de una por segundo aproximadamente, y guardar el resultado en memoria durante la sesión. Pedirlas en paralelo o seguidas supera las 25 RCU y produce `503 DEPENDENCY_UNAVAILABLE`, y puede llegar al límite de la API con `429`. Para una tabla, bastan páginas de 25 registros.
- **Listado.** `GET /items` no tiene orden garantizado ni total de páginas. Se avanza con `next_token`, que es `null` en la última página.
- **Valores.** `Last_Eruption_Year` negativo es un año antes de nuestra era, `null` significa "sin dato", y `0` es un año válido. `Elevation` puede ser negativa (volcanes submarinos). `Country` tiene 88 valores distintos, algunos compartidos, como `Chile-Argentina`.
- **Fotos.** Las columnas `Primary_Photo_*` no se muestran ([ADR-0015](../adr/ADR-0015-busqueda-por-identificador-sin-imagenes.md)).
- **Dispositivos.** Basta con que funcione en escritorio; no se exige adaptación a móvil.
