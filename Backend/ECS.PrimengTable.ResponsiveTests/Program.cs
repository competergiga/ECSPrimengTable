using System.Text.Json;
using ECS.PrimengTable.Attributes;
using ECS.PrimengTable.Enums;
using ECS.PrimengTable.Models;
using ECS.PrimengTable.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

static void Check(bool condition, string message) {
    if (!condition) throw new Exception(message);
}
var config = EcsPrimengTableService.GetTableConfiguration<Example>();
var legacy = config.ColumnsInfo.Single(c => c.Field == "legacy");
Check(legacy.VisibleOnlyIn == null && !legacy.StartHidden, "Legacy defaults changed");
Check(!JsonSerializer.Serialize(legacy, new JsonSerializerOptions(JsonSerializerDefaults.Web)).Contains("visibleOnlyIn"), "Unconfigured metadata changed");
var desktop = config.ColumnsInfo.Single(c => c.Field == "desktop");
Check(desktop.VisibleOnlyIn!.SequenceEqual(new[] { DeviceType.Desktop }), "Attribute did not reach metadata");
var json = JsonSerializer.Serialize(desktop, new JsonSerializerOptions(JsonSerializerDefaults.Web));
Check(JsonDocument.Parse(json).RootElement.GetProperty("visibleOnlyIn")[0].GetInt32() == 2, "Wire enum mismatch");
Check(config.ColumnsInfo.Single(c => c.Field == "tablet").VisibleOnlyIn!.Length == 2, "Multiple values lost");
Check(config.ColumnsInfo.Single(c => c.Field == "all").VisibleOnlyIn!.Length == 3, "Three values lost");
Check(config.ColumnsInfo.Single(c => c.Field == "empty").VisibleOnlyIn!.Length == 0, "Empty array lost");
var overridden = EcsPrimengTableService.GetTableConfiguration<Example>(dynamicAttributes: new() {
    ["desktop"] = new ColumnMetadataOverrideModel { VisibleOnlyIn = new[] { DeviceType.Mobile } },
    ["tablet"] = new ColumnMetadataOverrideModel { VisibleOnlyIn = Array.Empty<DeviceType>() }
});
Check(overridden.ColumnsInfo.Single(c => c.Field == "desktop").VisibleOnlyIn![0] == DeviceType.Mobile, "Dynamic override failed");
Check(overridden.ColumnsInfo.Single(c => c.Field == "tablet").VisibleOnlyIn!.Length == 0, "Clearing override failed");
Console.WriteLine("Responsive metadata: 9 assertions passed.");
Check(legacy.HeaderGroup == null, "Legacy columns must not have a header group");
Check(!JsonSerializer.Serialize(legacy, new JsonSerializerOptions(JsonSerializerDefaults.Web)).Contains("headerGroup"), "Unconfigured group must be omitted");
Check(desktop.HeaderGroup == "Group1", "Header group attribute did not reach metadata");
Check(JsonDocument.Parse(json).RootElement.GetProperty("headerGroup").GetString() == "Group1", "Header group wire value changed");
var grouped = EcsPrimengTableService.GetTableConfiguration<Example>(dynamicAttributes: new() {
    ["desktop"] = new ColumnMetadataOverrideModel { HeaderGroup = "Group2" },
    ["tablet"] = new ColumnMetadataOverrideModel { HeaderGroup = "" }
});
Check(grouped.ColumnsInfo.Single(c => c.Field == "desktop").HeaderGroup == "Group2", "Group override failed");
Check(grouped.ColumnsInfo.Single(c => c.Field == "tablet").HeaderGroup == "", "Clearing group override failed");
Console.WriteLine("Header group metadata: 6 assertions passed.");
ProgressChecks.Run();
TreeChecks.Run();
ListFilterPreservesEscapedJsonAndCaseInsensitiveMatching();
await StartupServesSwaggerAndCors();

static void ListFilterPreservesEscapedJsonAndCaseInsensitiveMatching() {
    var rows = new[] {
        new Example { Legacy = "match", Statuses = "OTHER;A\"B" },
        new Example { Legacy = "other", Statuses = "OTHER" }
    }.AsQueryable();
    var request = new TableQueryRequestModel {
        Page = 0,
        PageSize = 10,
        Columns = new List<string> { "statuses" },
        Filter = new Dictionary<string, List<ColumnFilterModel>> {
            ["statuses"] = new List<ColumnFilterModel> {
                new ColumnFilterModel {
                    Value = JsonSerializer.Deserialize<JsonElement>("\"a\\\"b\""),
                    MatchMode = "equals",
                    Operator = "and"
                }
            }
        }
    };

    var keys = EcsPrimengTableService.GetSelectionKeys(request, rows, row => row.Legacy);

    Check(keys.SequenceEqual(new[] { "match" }), "List filters must decode escaped JSON and preserve case-insensitive matching.");
    Console.WriteLine("List filter compatibility: 1 assertion passed.");
}

static async Task StartupServesSwaggerAndCors() {
    using var host = ECSPrimengTableExample.Program.CreateHostBuilder(Array.Empty<string>())
        .UseEnvironment("Development")
        .ConfigureWebHost(webBuilder => webBuilder.UseUrls("http://127.0.0.1:0"))
        .Build();
    await host.StartAsync();
    try {
        var server = host.Services.GetRequiredService<IServer>();
        var address = server.Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        using var client = new HttpClient { BaseAddress = new Uri(address) };

        using var response = await client.GetAsync("/swagger/v1/swagger.json");
        var payload = await response.Content.ReadAsStringAsync();

        Check(response.IsSuccessStatusCode, "Startup must serve the Swagger document.");
        using var document = JsonDocument.Parse(payload);
        Check(document.RootElement.GetProperty("info").GetProperty("title").GetString() == "PrimeNG table reusable component",
            "Startup must preserve Swagger API metadata.");
        var path = document.RootElement.GetProperty("paths").EnumerateObject().First().Name;
        using var preflight = new HttpRequestMessage(HttpMethod.Options, path);
        preflight.Headers.Add("Origin", "https://example.com");
        preflight.Headers.Add("Access-Control-Request-Method", "GET");

        using var cors = await client.SendAsync(preflight);

        Check(cors.IsSuccessStatusCode && cors.Headers.GetValues("Access-Control-Allow-Origin").Single() == "*",
            "Startup must preserve permissive CORS on controller endpoints.");
        Console.WriteLine("Startup HTTP compatibility: 3 assertions passed.");
    } finally {
        await host.StopAsync();
    }
}

public class Example {
    [ColumnAttributes("Legacy")]
    public string Legacy { get; set; } = "";
    [ColumnAttributes("Desktop", VisibleOnlyIn = new[] { DeviceType.Desktop }, HeaderGroup = "Group1")]
    public string Desktop { get; set; } = "";
    [ColumnAttributes("Tablet", VisibleOnlyIn = new[] { DeviceType.Desktop, DeviceType.Tablet }, HeaderGroup = "Group1")]
    public string Tablet { get; set; } = "";
    [ColumnAttributes("All", VisibleOnlyIn = new[] { DeviceType.Desktop, DeviceType.Tablet, DeviceType.Mobile })]
    public string All { get; set; } = "";
    [ColumnAttributes("Empty", VisibleOnlyIn = new DeviceType[] {})]
    public string Empty { get; set; } = "";
    [ColumnAttributes("Statuses", dataType: DataType.List)]
    public string Statuses { get; set; } = "";
}
