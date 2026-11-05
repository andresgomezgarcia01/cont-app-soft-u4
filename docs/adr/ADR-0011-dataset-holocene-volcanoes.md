# ADR-0011: Dataset Holocene Volcanoes del Smithsonian

**Estado:** Aprobada

## Contexto

La solución necesita un conjunto de datos público en CSV que tenga un identificador único, que quepa en la capacidad gratuita de DynamoDB y que combine números y texto, de modo que se pueda comprobar la conservación de tipos y mostrar información útil.

## Decisión

Se usa el catálogo **Volcanoes of the World: Holocene Volcanoes** del Global Volcanism Program (Smithsonian Institution), con descarga directa y sin credenciales. Tiene 1 214 filas y 21 columnas (1,9 MB), y su identificador principal es `Volcano_Number`, un entero sin vacíos ni duplicados. Su carga consume unas 2 650 WCU *(estimado; verificar en la carga real)*.

## Alternativas consideradas

- **OurAirports (86 311 filas), OpenFlights airports (7 698), sismos de USGS (2 387) y Pokémon de PokeAPI (1 351):** los dos primeros y los sismos pesan más en la capacidad gratuita o no ofrecen las mismas categorías; Pokémon cabe, pero sus datos resultan menos interesantes.

## Consecuencias

**Positivas**

- Sus columnas categóricas permiten resumir los datos en la interfaz, por ejemplo volcanes por país o por tipo de relieve.
- Combina enteros, decimales y texto, lo que permite comprobar que los tipos se conservan.

**Negativas**

- Hay valores que requieren cuidado: `Last_Eruption_Year` tiene 366 vacíos y 170 negativos (antes de nuestra era), `Elevation` tiene 2 vacíos y valores negativos, y 8 celdas contienen saltos de línea.
- El catálogo se actualiza, así que cada descarga se guarda con su fecha en el nombre (`incoming/volcanoes-AAAA-MM-DD.csv`), y la carga y su verificación usan ese mismo objeto.
- La fuente puede bloquear peticiones automáticas. En ese caso, el archivo se descarga desde el navegador y se sube desde la consola de S3 o con `aws s3 cp`.
- El uso queda limitado a fines no comerciales y exige citar la fuente (ver [fuente-de-datos.md](../fuente-de-datos.md)).
