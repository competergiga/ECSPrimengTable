# Changelog / Historial de cambios

## Backend 8.2.1 / Frontend 19.2.1

**English · Planned release**

- Backend: include the column-specific Excel date format (`ExportDateFormat`) in the table configuration.
- Frontend: restore the saved column order, including columns that cannot be hidden. Required columns missing from older views remain visible, and frozen columns keep their side.
- Frontend: add the optional `showDataLoadTime` setting to show the duration of the last successful load next to the record count in regular and tree grids. It is disabled by default. The demo uses this option in place of the timer in its navigation bar.

**Español · Versión prevista**

- Backend: se incluye el formato de fecha de Excel por columna (`ExportDateFormat`) en la configuración de la tabla.
- Frontend: se respeta el orden guardado, incluidas las columnas que no se pueden ocultar. Las columnas obligatorias que falten en vistas antiguas siguen visibles y las congeladas conservan su lado.
- Frontend: la opción `showDataLoadTime` muestra cuánto tardó la última carga correcta junto al contador de registros en tablas normales y de árbol. Está desactivada por defecto. La demo usa esta opción en lugar del indicador de la barra de navegación.


## Backend 8.2.0 / Frontend 19.2.0

**English**

- Backend and frontend: add an optional tree grid with three loading modes: load the whole tree, load children on demand, or paginate children. Support tree filtering, saved expansion state, and Excel export.
- Backend and frontend: allow users to select all rows matching the current filter across pages in regular and tree grids. Clearing that selection preserves rows selected outside the filter.
- Frontend: make the minimum search length and debounce delay configurable for global search.
- Demo: show the duration of the last data request in the navigation bar.

**Español**

- Backend y frontend: se incorpora un grid de árbol opcional con tres modos de carga: árbol completo, hijos bajo demanda o hijos paginados. Admite filtros jerárquicos, restauración de nodos expandidos y exportación a Excel.
- Backend y frontend: se pueden seleccionar todos los registros que coinciden con el filtro actual, aunque estén en otras páginas, tanto en tablas normales como de árbol. Al desmarcarlos, se mantienen las selecciones ajenas al filtro.
- Frontend: se pueden configurar el mínimo de caracteres de la búsqueda global y el tiempo de espera tras dejar de escribir.
- Demo: se muestra el tiempo de la última petición de datos en la barra de navegación.

## Backend 8.1.4 / Frontend 19.1.9

**English**

- Backend and frontend: add optional column group headers through `HeaderGroup`. Groups span consecutive visible columns and are recalculated when columns are hidden or reordered.
- Backend: add explicit minimum versions for `Microsoft.Extensions.Caching.Memory` and `System.IO.Packaging` to address vulnerable NuGet dependencies in the ComPeter package.
- Demo: fix SQL setup scripts and ensure demo usernames are unique.

**Español**

- Backend y frontend: se añaden encabezados de grupo opcionales con `HeaderGroup`. Agrupan columnas visibles consecutivas y se recalculan al ocultar o reordenar columnas.
- Backend: se fijan versiones mínimas explícitas de `Microsoft.Extensions.Caching.Memory` y `System.IO.Packaging` para corregir dependencias vulnerables de NuGet en el paquete de ComPeter.
- Demo: se corrigen los scripts de inicialización de SQL y se garantiza que los nombres de usuario de ejemplo sean únicos.

## Backend 8.1.3 / Frontend 19.1.8

**English**

- Backend and frontend: add progress bars as an optional display for numeric columns through `CellDisplay.ProgressBar`. The underlying value remains numeric for sorting, filtering, and export.
- Demo: add a progress bar example.

**Español**

- Backend y frontend: se añaden barras de progreso como presentación opcional para columnas numéricas mediante `CellDisplay.ProgressBar`. El valor sigue siendo numérico al ordenar, filtrar y exportar.
- Demo: se añade un ejemplo de barras de progreso.

## Backend 8.1.2 / Frontend 19.1.7

**English**

- Backend and frontend: support a custom tooltip for each item in a list column. Tooltip text is matched by position, preserving empty entries. The backend also fixes the casing of custom tooltip source fields in the column metadata.
- Frontend: extend translation support to grid text beyond column headers.

**Español**

- Backend y frontend: se admite un texto de ayuda personalizado para cada elemento de una columna de lista. Los textos se asignan por posición y se respetan las entradas vacías. El backend también corrige las mayúsculas y minúsculas de los campos de origen en los metadatos de columna.
- Frontend: se amplía la traducción a los textos del grid además de los encabezados de columna.
