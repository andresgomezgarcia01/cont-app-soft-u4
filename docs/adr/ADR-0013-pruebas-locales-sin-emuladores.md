# ADR-0013: Pruebas locales sin credenciales ni emuladores

**Estado:** Aprobada

## Contexto

Las funciones y la infraestructura deben poder validarse sin una cuenta de AWS, de modo que cada persona trabaje de forma independiente. Conviene hacerlo sin credenciales, sin Docker y sin emuladores que haya que instalar y levantar.

## Decisión

Las funciones en Node.js (`api` y `loader`) se prueban con `node:test`, y el AWS SDK se simula con clientes falsos cuyo método `send` devuelve las respuestas de cada prueba. Así, el handler de `loader` recibe un evento de S3 de prueba, lee un CSV de muestra y envía los ítems esperados, y el handler de `api` recibe eventos de API Gateway y responde según el contrato. La función `authorizer` se prueba con `pytest` y `moto`, que simula Parameter Store en memoria.

Terraform se valida sin credenciales con `terraform fmt -check`, `terraform init -backend=false` y `terraform validate`. Lo netamente funcional se comprueba en la nube.

## Alternativas consideradas

- **LocalStack:** exige instalar y levantar un servicio, mientras que estas pruebas simulan AWS dentro de su propio proceso.
- **Imágenes con RIE y un emulador en Docker Compose:** tienen el mismo costo de instalar y levantar servicios, y dependen de imágenes que esta solución no usa (ADR-0001).

## Consecuencias

**Positivas**

- Las pruebas corren sin credenciales, sin Docker y sin levantar servicios, tanto en local como en el pipeline.
- Las pruebas de Node.js no necesitan librerías de simulación: los clientes falsos se escriben dentro de cada prueba.

**Negativas**

- Los clientes falsos devuelven respuestas definidas en cada prueba y no tienen una tabla en memoria, de modo que la carga y la consulta se prueban por separado.
- Son simulaciones, así que no reemplazan la verificación en AWS: la carga real, el conteo y las consultas se comprueban con el reporte de la carga, la consola de AWS y pruebas manuales.
- La validación de Terraform revisa formato y validez, pero no aplica la configuración: sus errores de aplicación solo aparecen en el despliegue.
