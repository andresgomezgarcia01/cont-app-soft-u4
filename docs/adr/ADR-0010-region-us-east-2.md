# ADR-0010: Región us-east-2

**Estado:** Aprobada

## Contexto

Toda la solución se despliega en una sola región de AWS. La elección debe mantener el costo cercano a cero y garantizar que estén disponibles los servicios que se usan.

## Decisión

Se despliega en `us-east-2` (Ohio). La capa gratuita de DynamoDB aplica por región y por cuenta, y el Free Tier solo excluye las regiones de China y GovCloud.

## Alternativas consideradas

- **us-east-1:** también es válida, pero no aporta una ventaja para esta solución, porque CloudFront usa su certificado por defecto y no exige recursos en esa región.
- **sa-east-1:** se descarta por precio.

## Consecuencias

**Positivas**

- El consumo previsto se mantiene dentro de la capa gratuita de DynamoDB (ADR-0002).

**Negativas**

- El bucket de estado debe crearse indicando `LocationConstraint`; de lo contrario, queda en `us-east-1`.
- La diferencia de precio frente a `us-east-1` no se comparó servicio por servicio. Con este consumo sería marginal *(verificar en la facturación)*.
- El criterio no es la cercanía a los usuarios. El objetivo de latencia se mide en API Gateway, de modo que no refleja la distancia de red hasta el navegador.
- No debe haber otras tablas aprovisionadas en `us-east-2`, porque compartirían la capacidad gratuita.
