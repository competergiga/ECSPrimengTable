# ECS PrimeNG table

## .NET 5 backend compatibility

All three backend projects target `net5.0` with nullable reference types enabled.
Building requires the .NET 8 SDK or newer (C# 12), not the .NET 5 SDK: existing
required members, primary constructors and collection expressions are preserved.
Required-member compiler attributes are supplied locally for .NET 5.
EF Core and its SQL Server/tools packages use 5.0.17. The example uses
Host/Startup rather than minimal hosting, and Swagger 6.6.2. ClosedXML 0.102.3,
System.IO.Packaging 6.0.1 and MemoryCache 6.0.3 use compatible framework assets.
EF Core 5 table comments are retained; triggers remain managed by SQL Server,
without the later EF Core `HasTrigger` mapping API. Existing SQL triggers must
remain installed. No database migration or schema change is included.

From the repository root:

```powershell
dotnet build Backend/ECSPrimengTable.sln
dotnet run --project Backend/ECS.PrimengTable.ResponsiveTests
```

Running normally requires the .NET 5 and ASP.NET Core 5 runtimes. If unavailable,
the checks can be run on a newer runtime as a compatibility smoke test:

```powershell
dotnet run --project Backend/ECS.PrimengTable.ResponsiveTests --roll-forward Major
```

Roll-forward does not validate execution on the actual .NET 5 runtime. The checks
exercise in-memory queries, Excel export and HTTP startup/Swagger/CORS; they do
not validate SQL Server query translation, persistence or trigger execution.
.NET 5 and EF Core 5 are out of support. This migration does not restore security
support; evaluate the old dependency stack before deploying to production.

This NuGet package contains ECS PrimeNG table.  
For full documentation, usage instructions, examples, and updates, please visit the official GitHub repository:
[https://github.com/competergiga/ECSPrimengTable/tree/Angular19-publish](https://github.com/competergiga/ECSPrimengTable/tree/Angular19-publish)

> **Note:** Make sure to check the GitHub README for detailed guidance on how to integrate and use this component in your projects.
## Responsive options

Header and row menus are optional and disabled by default. Enable `responsive.headerMenu` and `responsive.rowMenu`. The optional DTO attribute `VisibleOnlyIn` sets initial visibility by viewport while keeping columns available in the selector.

See [configuration, precedence and examples](https://github.com/competergiga/ECSPrimengTable/blob/Angular19-publish/README.md#10-responsive-menus-and-initial-column-visibility).
