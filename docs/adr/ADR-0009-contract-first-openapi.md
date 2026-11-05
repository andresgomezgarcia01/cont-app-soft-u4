# ADR-0009: Contract-first con OpenAPI y frontend contra la API desplegada

**Estado:** Aprobada

## Contexto

El backend y el frontend se desarrollan en paralelo, por personas distintas. Necesitan un acuerdo común sobre las respuestas de la API y una forma de que el frontend avance sin esperar a que exista toda la lógica.

## Decisión

El contrato de la API (`contracts/openapi.yaml`) se define antes de implementar y es la fuente de verdad. A partir de ahí, agregar campos opcionales es compatible; en cambio, quitar o renombrar campos, o cambiar un tipo, exige acordarlo entre backend y frontend y actualizar el archivo primero.

El frontend se desarrolla en local contra la API desplegada, sin mock local: recibe la URL por una variable de entorno de compilación y usa la llave en la pantalla de ingreso. La primera versión de la función `api` devuelve los ejemplos del contrato, de modo que el frontend puede empezar antes de que exista la lógica real.

## Alternativas consideradas

- **Mock local con Prism:** habría que instalarlo y mantenerlo, cuando la primera versión de `api` ya entrega los ejemplos del contrato.
- **Acordar las respuestas de manera informal:** no deja una fuente de verdad contra la cual implementar y resolver diferencias.

## Consecuencias

**Positivas**

- Backend y frontend trabajan contra un mismo archivo, sin herramientas adicionales.
- El frontend prueba desde el inicio contra el gateway real, incluidos la llave y CORS.

**Negativas**

- El frontend depende de la API desplegada: si no está lista, no avanza. Lo mitiga la primera versión de `api`, que devuelve los ejemplos del contrato.
- CORS debe admitir el origen local durante el desarrollo (ADR-0005).
