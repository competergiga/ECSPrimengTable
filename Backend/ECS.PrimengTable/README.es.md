> Versión en español. [Read in English](README.md).

# ECS PrimeNG table

## Compatibilidad del backend con .NET 5

Los tres proyectos del backend usan `net5.0` y referencias anulables habilitadas.
Para compilar se necesita el SDK .NET 8 o posterior (C# 12), no el SDK .NET 5:
se conservan los miembros `required`, constructores primarios y expresiones de
colecciones existentes. Los atributos de compilacion necesarios se incluyen
localmente. EF Core, SQL Server y Tools usan 5.0.17; el ejemplo utiliza
Host/Startup y Swagger 6.6.2. ClosedXML 0.102.3, System.IO.Packaging 6.0.1 y
MemoryCache 6.0.3 utilizan assets compatibles.
Los comentarios de las tablas se conservan mediante EF Core 5. Los triggers
siguen gestionados por SQL Server, sin la API posterior `HasTrigger`; deben
permanecer instalados. No se incluye cambio de esquema ni migracion de datos.

Desde la raiz del repositorio:

```powershell
dotnet build Backend/ECSPrimengTable.sln
dotnet run --project Backend/ECS.PrimengTable.ResponsiveTests
```

La ejecucion normal requiere los runtimes .NET 5 y ASP.NET Core 5. Si no estan
instalados, puede realizarse una prueba de compatibilidad con un runtime posterior:

```powershell
dotnet run --project Backend/ECS.PrimengTable.ResponsiveTests --roll-forward Major
```

Esta alternativa no valida la ejecucion sobre el runtime real de .NET 5.
Las pruebas cubren consultas en memoria, Excel y arranque HTTP/Swagger/CORS,
no traduccion SQL, persistencia ni ejecucion de triggers en SQL Server.
.NET 5 y EF Core 5 estan fuera de soporte. La migracion no recupera soporte
de seguridad; debe evaluarse la pila antigua antes de desplegar en produccion.

Este paquete NuGet, `ComPeter.PrimeNGTable`, contiene un fork de ECS PrimeNG Table.
Para consultar la documentación completa, las instrucciones de uso, los ejemplos y las actualizaciones, visita la rama de publicación del repositorio de ComPeter:
[https://github.com/competergiga/ECSPrimengTable/tree/Angular19-publish](https://github.com/competergiga/ECSPrimengTable/tree/Angular19-publish)

> **Nota:** Consulta el README de GitHub para obtener instrucciones detalladas sobre cómo integrar y utilizar este componente en tus proyectos.

## Opciones responsive

Los menús de cabecera y fila son opcionales y están desactivados por defecto. Actívalos con `responsive.headerMenu` y `responsive.rowMenu`. El atributo opcional `VisibleOnlyIn` del DTO define la visibilidad inicial por tamaño y mantiene las columnas disponibles en el selector.

Consulta [configuración, prioridades y ejemplos](../../README.es.md#10-menús-adaptables-y-visibilidad-inicial-de-columnas).
