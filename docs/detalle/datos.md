# Datos

## Dataset

Catálogo **Volcanoes of the World: Holocene Volcanoes** del Global Volcanism Program, Smithsonian Institution ([ADR-0011](../adr/ADR-0011-dataset-holocene-volcanoes.md)). La cita y los términos de uso están en [fuente-de-datos.md](../fuente-de-datos.md). La descarga es directa y sin credenciales:

`https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes&outputFormat=csv`

| Aspecto | Valor, según el perfilado del archivo descargado |
|---|---|
| Registros | 1 214 filas y 21 columnas (1,9 MB) |
| Identificador principal | `Volcano_Number` (entero, sin vacíos ni duplicados) |
| Tipos presentes | Enteros (`Volcano_Number`, `Last_Eruption_Year`, `Elevation`), decimales (`Latitude`, `Longitude`) y texto |
| Valores que requieren cuidado | `Last_Eruption_Year` tiene 366 vacíos y 170 valores negativos (antes de nuestra era); `Elevation` tiene 2 vacíos y valores negativos (volcanes submarinos); `Country` tiene 88 valores distintos, algunos compartidos, como `Chile-Argentina`; 8 celdas contienen saltos de línea |
| Consumo estimado de escritura | Unas 2 650 WCU por carga (ítems de 1,8 KB en promedio) |

`Volcano_Name` no sirve como clave porque 4 nombres se repiten.

Como el catálogo se actualiza, cada descarga se guarda con su fecha en el nombre (`incoming/volcanoes-AAAA-MM-DD.csv`). Ese objeto es la copia congelada contra la que se verifica la carga, de modo que la carga y la verificación usan siempre el mismo archivo. Si la fuente bloquea `scripts/download-dataset.py`, el archivo se descarga desde el navegador y se sube desde la consola de S3 o con `aws s3 cp`.

## Tabla `eds-dev-items`

| Elemento | Definición |
|---|---|
| Clave de partición | `Volcano_Number` (Number) |
| Índices secundarios | Ninguno |
| Modo de capacidad | `PROVISIONED`, con 25 WCU y 25 RCU, sin autoescalado |
| Cifrado | Por defecto |

Es la única tabla de la solución, y cada ítem conserva las columnas del CSV con sus nombres originales y su tipo.

## Contrato de esquema

El archivo `services/common/schema/volcanoes.schema.json` define cómo se interpreta el CSV ([ADR-0008](../adr/ADR-0008-contrato-de-esquema.md)). El encabezado del CSV debe coincidir con estas columnas.

```json
{
  "dataset_id": "volcanoes",
  "primary_key": "Volcano_Number",
  "columns": [
    { "name": "FID",                   "type": "string" },
    { "name": "Volcano_Number",        "type": "integer", "required": true },
    { "name": "Volcano_Name",          "type": "string",  "required": true },
    { "name": "Volcanic_Landform",     "type": "string" },
    { "name": "Primary_Volcano_Type",  "type": "string" },
    { "name": "Last_Eruption_Year",    "type": "integer" },
    { "name": "Country",               "type": "string",  "required": true },
    { "name": "Region",                "type": "string" },
    { "name": "Subregion",             "type": "string" },
    { "name": "Geological_Summary",    "type": "string" },
    { "name": "Latitude",              "type": "decimal", "required": true },
    { "name": "Longitude",             "type": "decimal", "required": true },
    { "name": "Elevation",             "type": "integer" },
    { "name": "Tectonic_Setting",      "type": "string" },
    { "name": "Geologic_Epoch",        "type": "string" },
    { "name": "Evidence_Category",     "type": "string" },
    { "name": "Primary_Photo_Link",    "type": "string" },
    { "name": "Primary_Photo_Caption", "type": "string" },
    { "name": "Primary_Photo_Credit",  "type": "string" },
    { "name": "Major_Rock_Type",       "type": "string" },
    { "name": "GeoLocation",           "type": "string" }
  ]
}
```

Las columnas `Primary_Photo_*` se cargan como texto para conservar el dataset completo, aunque la interfaz no las muestra ([ADR-0015](../adr/ADR-0015-busqueda-por-identificador-sin-imagenes.md)).

## Correspondencia de tipos

| Tipo en contrato | Tipo DynamoDB | Regla de conversión |
|---|---|---|
| `string` | `S` | Se recortan espacios. |
| `integer` | `N` | Entero estricto; `"12.0"` se rechaza con `TYPE_CAST_FAILED`. |
| `decimal` | `N` | Se valida el texto y se envía a DynamoDB tal cual, sin convertirlo a `Number`, para conservar su precisión. Se rechazan `NaN` e infinitos, que DynamoDB no admite. |
| celda vacía | (atributo omitido) | Indica que no hay dato y evita guardar cadenas vacías. La API lo devuelve como `null`. |

## Objetos en el bucket de ingesta

| Objeto | Contenido |
|---|---|
| `incoming/*.csv` | Archivo de entrada. La notificación de S3 solo escucha este prefijo y el sufijo `.csv`. |
| `reports/<run_id>/summary.json` | Reporte de la carga. Se consulta solo como evidencia, así que no va en una tabla. |
| `reports/<run_id>/rejected.csv` | Filas rechazadas, con su [código de error](errores.md#errores-de-la-carga). |

**Reporte.** Sus campos son `run_id`, `source_key`, `status`, `error_code` (solo si falla), `started_at`, `finished_at`, `rows_read`, `rows_written` y `rows_rejected`. El estado final es `SUCCEEDED` (sin rechazos), `SUCCEEDED_WITH_REJECTIONS` o `FAILED`.
