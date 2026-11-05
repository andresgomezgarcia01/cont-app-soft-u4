# ADR-0005: CloudFront de pago por uso con bucket privado

**Estado:** Aprobada

## Contexto

La interfaz web compila a archivos estáticos (SPA) y debe servirse por HTTPS, sin buckets públicos, sin dominio propio y con un costo cercano a cero. La solución se despliega en una cuenta con el Free plan de AWS.

## Decisión

El sitio se sirve con CloudFront en modo normal de pago por uso, desde un bucket privado al que la distribución accede mediante OAC, con condición sobre su ARN. Para que las rutas de la SPA funcionen directamente, CloudFront devuelve `index.html` ante los errores 403 y 404 del bucket. La API no pasa por CloudFront: el navegador llama directamente a API Gateway, con CORS.

## Alternativas consideradas

- **Hosting estático de S3 público:** obligaría a tener un bucket público y no da el HTTPS que CloudFront sí ofrece.
- **Plan Free de precio fijo de CloudFront:** es un plan de la distribución, distinto del Free plan de la cuenta. Exige WAF, y AWS indica que las cuentas Free Tier no pueden usarlo *(verificar para el Free plan)*.
- **API detrás de CloudFront:** dejar la API aparte simplifica CloudFront y el desarrollo local.

## Consecuencias

**Positivas**

- El sitio tiene HTTPS con el dominio de CloudFront, y ningún bucket es público.
- La capa gratuita permanente de CloudFront (1 TB y 10 millones de peticiones al mes) cubre este volumen.
- Los errores 403 y 404 que CloudFront convierte en `index.html` no afectan a la API.

**Negativas**

- El sitio usa el dominio que asigna CloudFront, no uno propio.
- Al estar la API en otro origen, hace falta CORS. Por ahora admite cualquier origen mediante la variable `cors_allow_origins`, para facilitar el desarrollo local. No reemplaza la llave, y se puede restringir al dominio de CloudFront.
- Cada despliegue del sitio requiere una invalidación de CloudFront.
