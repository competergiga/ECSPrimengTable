# Migración a los paquetes ComPeter

Esta guía explica cómo migrar una aplicación existente desde los paquetes npm y NuGet originales de ECS a los paquetes renombrados de la rama `Angular19-publish`.

## Correspondencia de paquetes y alcance de las versiones

| Plataforma | Paquete original | Paquete ComPeter | Versión declarada en esta rama |
| --- | --- | --- | --- |
| Angular / npm | `@eternalcodestudio/primeng-table` | `@competer/primeng-table` | `19.2.0` |
| .NET / NuGet | `ECS.PrimeNGTable` | `ComPeter.PrimeNGTable` | `8.2.0` |

Estas son las versiones declaradas en el repositorio; no se ha verificado que sean las últimas disponibles en los registros de paquetes. Consulta el [manifiesto npm](Frontend/ECSPrimengTable/projects/ecs-primeng-table/package.json) y el [proyecto .NET](Backend/ECS.PrimengTable/ECS.PrimengTable.csproj).

El cambio de nombre de los paquetes no cambia los nombres de las clases exportadas de Angular, el selector del componente ni los espacios de nombres de C#. El método que genera la configuración y sus modelos de respuesta son iguales en las ramas comparadas.

Tras el merge de `Angular19`, `Angular19-publish` incluye las funcionalidades opcionales de tabla en árbol y selección en npm `19.2.0` y NuGet `8.2.0`. Migrar a estas versiones ya no implica renunciar a esas funcionalidades. Las tablas planas existentes no necesitan activar el modo árbol; las aplicaciones que lo utilicen deben verificar sus endpoints de árbol, modos de carga, selección y vistas guardadas después de migrar.

## 1. Sustituir la dependencia npm

Ejecuta estos comandos desde el directorio del paquete de tu aplicación Angular:

```powershell
npm uninstall @eternalcodestudio/primeng-table
npm install @competer/primeng-table@19.2.0
```

Incluye en la migración los cambios resultantes en las dependencias y en el archivo de bloqueo. Actualiza también las librerías internas que todavía dependan del paquete original.

Mantén la configuración existente de Angular 19 y PrimeNG 19. El cambio de nombre no exige por sí mismo cambiar las versiones de los frameworks. El manifiesto de ComPeter declara dependencias de tipo `peerDependencies` sobre Angular, PrimeNG, PrimeIcons y `@ngx-translate/core`; contrasta las advertencias de instalación con ese manifiesto en lugar de actualizar los frameworks sin comprobarlo.

## 2. Actualizar todos los imports de Angular

Sustituye el paquete de origen en cada importación y reexportación:

```typescript
import {
  ECSPrimengTable,
  ITableOptions,
  createTableOptions,
  ECSPrimengTableHttpService,
  ECSPrimengTableNotificationService
} from '@competer/primeng-table';
```

Los nombres de los símbolos exportados se mantienen. Aplica este cambio a componentes, adaptadores HTTP y de notificaciones, registros de proveedores, pruebas y archivos internos que agrupen reexportaciones.

Si tu aplicación importa desde `ecs-primeng-table`, comprueba cómo se resuelve ese nombre. La aplicación de ejemplo del repositorio lo utiliza como alias de TypeScript para la librería compilada localmente; no es el nombre del paquete ComPeter publicado. Al pasar al paquete npm, sustituye también esos imports por `@competer/primeng-table`.

Revisa `compilerOptions.paths` en la configuración de TypeScript. Elimina o actualiza las asignaciones que todavía resuelvan la librería hacia una copia antigua del código fuente o una compilación dentro de `dist`. No redirijas `@competer/primeng-table` a una copia local desactualizada.

Si las pruebas o los scripts de desarrollo cargan directamente el bundle FESM compilado, su nombre ha cambiado de `eternalcodestudio-primeng-table.mjs` a `competer-primeng-table.mjs` dentro de `dist/ecs-primeng-table/fesm2022`. Actualiza esas rutas y recompila antes de ejecutar las pruebas. Los imports de la aplicación deben utilizar el nombre público del paquete, no una ruta fija al bundle.

## 3. Usar el mismo paquete en proveedores y adaptadores

Conserva tus implementaciones HTTP y de notificaciones, pero importa sus clases base y los tokens de los proveedores desde `@competer/primeng-table`.

El registro de proveedores debe seguir utilizando los servicios de tu aplicación:

```typescript
import {
  ECSPrimengTableHttpService,
  ECSPrimengTableNotificationService
} from '@competer/primeng-table';

import { HttpService } from './core/services/http.service';
import { NotificationService } from './core/services/notification.service';
```

Mantén las siguientes entradas en el array de proveedores existente de tu aplicación o módulo, adaptando las rutas de los imports locales a tu proyecto:

```typescript
{ provide: ECSPrimengTableHttpService, useClass: HttpService },
{ provide: ECSPrimengTableNotificationService, useClass: NotificationService }
```

Actualiza también los imports dentro de `HttpService` y `NotificationService`. Conserva sus implementaciones y su herencia existentes.

No mezcles tokens del paquete npm antiguo con un componente del nuevo. Las clases exportadas por paquetes distintos tienen identidades diferentes en tiempo de ejecución, aunque sus nombres coincidan. Mezclarlas puede provocar fallos de inyección de dependencias; por sí solo, esto no explica una respuesta HTTP 400.

## 4. Conservar el contrato del adaptador HTTP

El adaptador HTTP debe seguir devolviendo un `Observable<HttpResponse<T>>`, no únicamente el cuerpo JSON deserializado. Si utilizas `HttpClient` de Angular, conserva `observe: 'response'` y la construcción de URLs, las cabeceras de autenticación, los interceptores y el tratamiento de errores existentes.

Por ejemplo, la petición de configuración subyacente debe seguir esta estructura, donde `url` es la URL resuelta de la API:

```typescript
return this.http.get<T>(url, { observe: 'response' });
```

La tabla lee la configuración desde `response.body`. No añadas una transformación que extraiga el cuerpo antes de entregar la respuesta a la tabla. Conserva el soporte de los tipos de respuesta JSON y blob del adaptador, incluidas las descargas de Excel.

## 5. Sustituir la referencia NuGet

En cada proyecto que referencie directamente el paquete original, sustituye su `PackageReference` por:

```xml
<PackageReference Include="ComPeter.PrimeNGTable" Version="8.2.0" />
```

Elimina la referencia antigua a `ECS.PrimeNGTable`. Si tu solución utiliza gestión centralizada de paquetes, actualiza la entrada `PackageVersion` correspondiente y las referencias de los proyectos, en lugar de añadir la versión directamente a cada proyecto.

Revisa los proyectos compartidos y los paquetes internos para detectar referencias transitivas al paquete original. El identificador del paquete ha cambiado, pero el nombre del ensamblado sigue siendo `ECS.PrimengTable`. Evita conservar ambos paquetes en el grafo de dependencias de la aplicación consumidora, ya que proporcionan la misma identidad o nombre de ensamblado, no implementaciones independientes que puedan coexistir.

El paquete de backend sigue teniendo .NET 8 como destino. Sus cambios de publicación también añaden referencias a `Microsoft.Extensions.Caching.Memory` y `System.IO.Packaging`, con versiones mínimas de `8.0.1`. Normalmente se restauran de forma transitiva; revisa cualquier advertencia de degradación de dependencias o conflicto de versiones en tu solución.

## 6. No cambiar los nombres de la API existente

Los siguientes elementos no cambian con esta migración:

- Los espacios de nombres de C#, como `ECS.PrimengTable.Services`, `ECS.PrimengTable.Models` y `ECS.PrimengTable.Attributes`.
- `EcsPrimengTableService.GetTableConfiguration<T>()` y `[ColumnAttributes(...)]`.
- Los nombres de las clases e interfaces exportadas de Angular.
- El selector HTML `<ecs-primeng-table>`.
- Las opciones de tabla, como `urlTableConfiguration` y `urlTableData`.
- Las URLs de los endpoints y los métodos HTTP de tu aplicación.
- El contrato JSON de configuración, incluidos `columnsInfo`, `allowedItemsPerPage` y los ajustes de fechas y vistas.

No sustituyas `ECS` por `ComPeter` en todo el código fuente. Solo hay que renombrar los identificadores de los paquetes y los orígenes de los imports npm.

## 7. Restaurar, compilar y verificar

Desde el directorio de la aplicación Angular, inspecciona los paquetes instalados y ejecuta la compilación y las pruebas habituales:

```powershell
npm ls @competer/primeng-table @eternalcodestudio/primeng-table
```

El árbol de dependencias debe utilizar el paquete ComPeter sin conservar el paquete original a través de otra dependencia.

Para el backend, sustituye `YourSolution.sln` por la ruta de tu solución:

```powershell
dotnet restore YourSolution.sln
dotnet list YourSolution.sln package --include-transitive
dotnet build YourSolution.sln
```

Confirma que el paquete NuGet original ya no está presente. Reinicia el servidor de desarrollo del frontend y la API del backend, o despliega los artefactos recompilados.

Verifica la carga de configuración, la consulta inicial de datos, el filtrado, la ordenación, la paginación, las vistas guardadas si están habilitadas y la exportación a Excel si se utiliza. Revisa la consola del navegador y el panel Network para detectar errores.

## Diagnosticar un HTTP 400 durante la carga de la tabla

Una respuesta HTTP 400 no demuestra por sí sola un problema de compatibilidad de paquetes. Primero identifica la petición exacta que falla; después de cargar la configuración se realizan otras peticiones que pueden fallar de forma independiente.

En el panel Network del navegador, recoge:

- La URL completa de la petición y su método HTTP.
- El cuerpo de la respuesta, especialmente cualquier objeto `errors` de validación.
- Los parámetros de consulta o el cuerpo de la petición, si los hay.

En el [controlador de ejemplo](Backend/ECSPrimengTableExample/Controllers/TestController.cs) del repositorio, la acción de configuración devuelve 200 si todo va bien o 500 si se produce una excepción. No devuelve explícitamente 400. La acción de datos sí devuelve 400 cuando falla la validación del tamaño de página o de las columnas. El controlador de tu aplicación puede comportarse de otra manera.

Coloca un punto de interrupción al principio de tu acción de configuración. Si no se alcanza, investiga el enrutamiento, la validación automática de modelos de ASP.NET Core, los middlewares o un proxy situado delante de la aplicación. Si se alcanza, revisa la acción y su tratamiento de excepciones para determinar dónde se origina el 400.

Si la petición que falla es en realidad la de datos, inspecciona la respuesta, el tamaño de página y las columnas enviados antes de modificar el endpoint de configuración. Si la configuración devuelve 200 pero el navegador falla al leerla, verifica tanto la estructura JSON como el contrato de `HttpResponse<T>` completo del adaptador descrito anteriormente.

El cambio de nombre de los paquetes no requiere modificar las URLs de configuración ni añadir parámetros a las peticiones. Diagnostica la respuesta antes de cambiar cualquiera de esos elementos.