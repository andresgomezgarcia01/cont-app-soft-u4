# Frontend

## Descripción

Volcano Explorer es una aplicación web desarrollada con React y Vite que permite consultar y explorar un catálogo de volcanes mediante una interfaz interactiva.

El frontend consume los servicios de la API desplegada y presenta la información a través de un dashboard, un explorador de registros, una vista de detalle y una guía de consulta.

## Funcionalidades

- **Dashboard:** presenta estadísticas generales y visualizaciones sobre los registros de volcanes.
- **Explorador:** permite consultar los registros mediante búsqueda por nombre, filtros, paginación y navegación por los resultados.
- **Detalle:** muestra la información disponible de cada volcán seleccionado.
- **Mapa interactivo:** permite explorar geográficamente los registros.
- **Guía:** proporciona información de consulta y atribución de la fuente de datos.

La búsqueda, los filtros y la resolución del detalle se realizan en el frontend sobre los registros cargados desde la API.

## Tecnologías

| Tecnología | Uso |
|---|---|
| React | Construcción de la interfaz de usuario. |
| Vite | Herramienta de desarrollo y compilación. |
| JavaScript | Lenguaje de programación. |
| React Router | Navegación entre páginas. |
| Chart.js | Visualización de estadísticas y gráficos. |
| Leaflet | Implementación del mapa interactivo. |
| Vitest | Ejecución de pruebas automatizadas. |
| jsdom | Entorno de pruebas del frontend. |

## Requisitos

- Node.js.
- npm.
- Acceso a la API desplegada.

## Configuración

Desde el directorio `frontend/`, instalar las dependencias:

```bash
npm ci
```

Configurar la variable de entorno `VITE_API_BASE_URL` con la URL base de la API desplegada.

Se puede definir en un archivo `.env` dentro de `frontend/`:

```env
VITE_API_BASE_URL=https://<api-url>
```

La aplicación solicita la API key al usuario durante el acceso y la conserva en `sessionStorage` durante la sesión del navegador.

## Ejecución en desarrollo

Iniciar el servidor local:

```bash
npm run dev
```

Vite mostrará la dirección local para acceder a la aplicación desde el navegador.

## Pruebas

Ejecutar las pruebas automatizadas:

```bash
npm run test
```

Las pruebas verifican el comportamiento del cliente de API, incluyendo el manejo de respuestas exitosas, errores de autenticación y reintentos ante respuestas HTTP 503.

## Validaciones

Ejecutar ESLint:

```bash
npm run lint
```

Generar la compilación de producción:

```bash
npm run build
```

Los archivos generados se almacenan en el directorio `dist/`.

## Fuente de datos

Los registros utilizados por la aplicación provienen del **Global Volcanism Program**, del Smithsonian Institution.

Fuente oficial: https://volcano.si.edu/

**Cita de la base de datos:**

> Global Volcanism Program, 2026. [Database] Volcanoes of the World (v. 5.4.0; 7 Aug 2026). Distributed by Smithsonian Institution, compiled by Venzke, E. https://volcano.si.edu/database/