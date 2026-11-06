# Migrating to ComPeter Packages

This guide covers migrating an existing application from the original ECS npm and NuGet packages to the renamed packages in the `Angular19-publish` branch.

## Package Mapping and Version Scope

| Platform | Original package | ComPeter package | Version declared in this branch |
| --- | --- | --- | --- |
| Angular / npm | `@eternalcodestudio/primeng-table` | `@competer/primeng-table` | `19.2.0` |
| .NET / NuGet | `ECS.PrimeNGTable` | `ComPeter.PrimeNGTable` | `8.2.0` |

These are the versions declared in the repository, not a verification of the latest versions available in the package registries. See the [npm manifest](Frontend/ECSPrimengTable/projects/ecs-primeng-table/package.json) and [.NET project](Backend/ECS.PrimengTable/ECS.PrimengTable.csproj).

The package rename does not rename the exported Angular classes, the component selector, or the C# namespaces. The configuration-generation method and its response models are unchanged between the compared branches.

Following the merge from `Angular19`, `Angular19-publish` includes the optional tree-table and selection features in npm `19.2.0` and NuGet `8.2.0`. Migrating to these versions no longer requires giving up those features. Existing flat tables do not need to enable tree mode; applications that use it should verify their tree endpoints, loading modes, selection, and saved views after migrating.

## 1. Replace the npm Dependency

Run these commands from your Angular application's package directory:

```powershell
npm uninstall @eternalcodestudio/primeng-table
npm install @competer/primeng-table@19.2.0
```

Include the resulting dependency and lockfile changes in your migration. Update any internal libraries that still depend on the original package as well.

Keep the existing Angular 19 and PrimeNG 19 setup. The rename itself does not require changing framework versions. The ComPeter manifest declares peer dependencies on Angular, PrimeNG, PrimeIcons, and `@ngx-translate/core`; check installation warnings against that manifest rather than upgrading frameworks blindly.

## 2. Update All Angular Imports

Replace the package source in every import and re-export:

```typescript
import {
  ECSPrimengTable,
  ITableOptions,
  createTableOptions,
  ECSPrimengTableHttpService,
  ECSPrimengTableNotificationService
} from '@competer/primeng-table';
```

The exported symbol names stay the same. Apply this change to components, HTTP and notification adapters, provider registration, tests, and internal barrel files.

If your application imports from `ecs-primeng-table`, check how that name is resolved. The repository demo uses it as a TypeScript alias for the locally built library; it is not the published ComPeter package name. When switching to the npm package, replace those imports with `@competer/primeng-table` too.

Inspect `compilerOptions.paths` in your TypeScript configuration. Remove or update mappings that would still resolve the library to an old source checkout or build under `dist`. Do not redirect `@competer/primeng-table` to an outdated local copy.

If tests or development scripts load the compiled FESM bundle directly, its filename has changed from `eternalcodestudio-primeng-table.mjs` to `competer-primeng-table.mjs` under `dist/ecs-primeng-table/fesm2022`. Update those paths and rebuild before testing. Application imports should use the public package name, not a hard-coded bundle path.

## 3. Keep Providers and Adapters on the Same Package

Retain your existing HTTP and notification implementations, but import their base classes and provider tokens from `@competer/primeng-table`.

Provider registration should continue to use your application services:

```typescript
import {
  ECSPrimengTableHttpService,
  ECSPrimengTableNotificationService
} from '@competer/primeng-table';

import { HttpService } from './core/services/http.service';
import { NotificationService } from './core/services/notification.service';
```

Keep the following entries in your existing application or module providers array, adjusting the local import paths to your project:

```typescript
{ provide: ECSPrimengTableHttpService, useClass: HttpService },
{ provide: ECSPrimengTableNotificationService, useClass: NotificationService }
```

Update the imports inside `HttpService` and `NotificationService` too. Keep their existing implementations and inheritance.

Do not mix tokens from the old npm package with a component from the new one. Classes exported by separate packages have distinct runtime identities, even when their names match. Mixing them can cause dependency-injection failures; it does not, by itself, explain an HTTP 400 response.

## 4. Preserve the HTTP Adapter Contract

The HTTP adapter must still return an `Observable<HttpResponse<T>>`, not just the parsed JSON body. When using Angular `HttpClient`, preserve `observe: 'response'` and your existing URL construction, authentication headers, interceptors, and error handling.

For example, the underlying configuration request should follow this shape, where `url` is the resolved API URL:

```typescript
return this.http.get<T>(url, { observe: 'response' });
```

The table reads configuration from `response.body`. Do not add a transformation that unwraps the body before passing the response to the table. Preserve support for the adapter's existing JSON and blob response types, including Excel downloads.

## 5. Replace the NuGet Reference

In each project that directly references the original package, replace its `PackageReference` with:

```xml
<PackageReference Include="ComPeter.PrimeNGTable" Version="8.2.0" />
```

Remove the old `ECS.PrimeNGTable` reference. If your solution uses central package management, update the corresponding `PackageVersion` entry and project references instead of adding a version directly to each project.

Check shared projects and internal packages for transitive references to the original package. The package ID changed, but the assembly name remains `ECS.PrimengTable`. Avoid retaining both packages in the consuming application's dependency graph, because they provide the same assembly identity/name rather than independent side-by-side implementations.

The backend package still targets .NET 8. Its publication changes also add references to `Microsoft.Extensions.Caching.Memory` and `System.IO.Packaging`, with minimum versions of `8.0.1`. These normally restore transitively; review any dependency downgrade or version-conflict warnings in your solution.

## 6. Do Not Rename the Existing API

The following remain unchanged for this migration:

- C# namespaces such as `ECS.PrimengTable.Services`, `ECS.PrimengTable.Models`, and `ECS.PrimengTable.Attributes`.
- `EcsPrimengTableService.GetTableConfiguration<T>()` and `[ColumnAttributes(...)]`.
- Angular exported class and interface names.
- The HTML selector `<ecs-primeng-table>`.
- Table options such as `urlTableConfiguration` and `urlTableData`.
- Your application's endpoint URLs and HTTP methods.
- The configuration JSON contract, including `columnsInfo`, `allowedItemsPerPage`, and the date and view settings.

Do not replace `ECS` with `ComPeter` throughout your source code. Only the package identifiers and npm import sources need renaming.

## 7. Restore, Build, and Verify

From the Angular application directory, inspect the installed packages and run your existing build and tests:

```powershell
npm ls @competer/primeng-table @eternalcodestudio/primeng-table
```

The dependency tree should use the ComPeter package without retaining the original package through another dependency.

For the backend, replace `YourSolution.sln` with your solution path:

```powershell
dotnet restore YourSolution.sln
dotnet list YourSolution.sln package --include-transitive
dotnet build YourSolution.sln
```

Confirm that the original NuGet package is no longer present. Restart the frontend development server and backend API, or deploy the rebuilt artifacts.

Verify configuration loading, initial data retrieval, filtering, sorting, pagination, saved views if enabled, and Excel export if used. Check the browser console and Network panel for errors.

## Troubleshooting HTTP 400 During Table Loading

An HTTP 400 response alone does not establish a package compatibility problem. First identify the exact failed request; configuration loading is followed by other requests that may fail independently.

In the browser Network panel, capture:

- The full request URL and HTTP method.
- The response body, especially any validation `errors` object.
- Query parameters or request payload, if present.

In the repository's [example controller](Backend/ECSPrimengTableExample/Controllers/TestController.cs), the configuration action returns 200 on success or 500 on an exception. It does not explicitly return 400. The data action does return 400 when page-size or column validation fails. Your application's controller may behave differently.

Set a breakpoint at the beginning of your configuration action. If it is not reached, investigate routing, automatic ASP.NET Core model validation, middleware, or an upstream proxy. If it is reached, inspect your action and exception handling to determine where the 400 originates.

If the failed request is actually the data request, inspect the response and submitted page size and columns before changing the configuration endpoint. If configuration returns 200 but the browser fails while reading it, verify both the JSON shape and the full `HttpResponse<T>` adapter contract described above.

The package rename does not require changing configuration URLs or adding request parameters. Diagnose the response before changing either.