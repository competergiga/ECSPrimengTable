#Requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$FrontendPort = 4215,
    [string]$NodePath,
    [string]$DotNetPath,
    [switch]$SkipBuild,
    [switch]$NoBrowser,
    [switch]$CheckOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$frontendDirectory = Join-Path $PSScriptRoot 'Frontend\ECSPrimengTable'
$backendDirectory = Join-Path $PSScriptRoot 'Backend\ECSPrimengTableExample'
$backendProject = Join-Path $backendDirectory 'ECSPrimengTableExample.csproj'
$backendAssembly = Join-Path $backendDirectory 'bin\Debug\net5.0\ECSPrimengTableExample.dll'
$angularCli = Join-Path $frontendDirectory 'node_modules\@angular\cli\bin\ng.js'
$apiUrl = 'http://localhost:5014'

function Test-PortInUse([int]$Port) {
    return @([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
        Where-Object { $_.Port -eq $Port }).Count -gt 0
}

function Invoke-Checked([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "El comando fallo con codigo ${LASTEXITCODE}: $Executable $($Arguments -join ' ')"
    }
}

function ConvertTo-Quoted([string]$Value) {
    return "'" + $Value.Replace("'", "''") + "'"
}

function Start-DemoWindow([string]$Title, [string]$Directory, [string]$Command) {
    $nodeDirectory = Split-Path -Parent $NodePath
    $script = @(
        '$ErrorActionPreference = ''Stop'''
        ('$Host.UI.RawUI.WindowTitle = ' + (ConvertTo-Quoted $Title))
        ('Set-Location -LiteralPath ' + (ConvertTo-Quoted $Directory))
        ('$env:PATH = ' + (ConvertTo-Quoted ($nodeDirectory + ';')) + ' + $env:PATH')
        '$env:ASPNETCORE_ENVIRONMENT = ''Development'''
        '$env:DOTNET_ROLL_FORWARD = ''LatestPatch'''
        $Command
        'if ($LASTEXITCODE -ne 0) { Write-Error (''El servidor termino con codigo '' + $LASTEXITCODE) }'
    ) -join [Environment]::NewLine
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
    $windowsPowerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
    $process = Start-Process -FilePath $windowsPowerShell -ArgumentList @(
        '-NoLogo', '-NoProfile', '-NoExit', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encoded
    ) -PassThru
    Write-Host "$Title iniciado (PID $($process.Id))."
}

if ($NodePath) {
    $NodePath = (Resolve-Path -LiteralPath $NodePath).Path
    $nodeCandidates = @($NodePath)
} else {
    $nodeCandidates = @()
    $installedNode = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($installedNode) { $nodeCandidates += $installedNode.Source }
    $nodeCandidates += Join-Path $env:TEMP 'ecs-node16\node-v16.20.2-win-x64\node.exe'
}
$NodePath = $null
foreach ($candidate in $nodeCandidates) {
    if (!(Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
    $candidateVersion = (& $candidate --version).Trim()
    if ($LASTEXITCODE -eq 0 -and $candidateVersion -match '^v(14|16)\.') {
        $NodePath = $candidate
        $nodeVersion = $candidateVersion
        break
    }
}
if (!$NodePath) { throw 'Angular 14 requiere Node.js 14.20+ o 16.10+. Instala Node 16 o indica -NodePath.' }
if ([version]$nodeVersion.TrimStart('v') -lt [version]'14.20.0' -or
    ($nodeVersion -like 'v16.*' -and [version]$nodeVersion.TrimStart('v') -lt [version]'16.10.0')) {
    throw 'La version de Node no es compatible: utiliza Node 14.20+ o 16.10+.'
}

$sdkCommand = Get-Command dotnet.exe -ErrorAction SilentlyContinue
if (!$sdkCommand) { throw 'Instala el SDK de .NET 8 o posterior para compilar el codigo C# de la demo.' }
$sdkPath = $sdkCommand.Source
$sdkVersion = (& $sdkPath --version).Trim()
if ($LASTEXITCODE -ne 0 -or [version]($sdkVersion -split '-')[0] -lt [version]'8.0') {
    throw 'La demo usa C# 12: necesita un SDK .NET 8 o posterior, aunque su destino sea net5.0.'
}

if ($DotNetPath) {
    $runtimeCandidates = @((Resolve-Path -LiteralPath $DotNetPath).Path)
} else {
    $runtimeCandidates = @($sdkPath, (Join-Path $env:TEMP 'ecs-dotnet5\dotnet.exe'))
}
$DotNetPath = $null
foreach ($candidate in $runtimeCandidates) {
    if (!(Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
    $runtimes = (& $candidate --list-runtimes) -join "`n"
    if ($LASTEXITCODE -eq 0 -and $runtimes -match '(?m)^Microsoft\.NETCore\.App 5\.0\.' -and
        $runtimes -match '(?m)^Microsoft\.AspNetCore\.App 5\.0\.') {
        $DotNetPath = $candidate
        break
    }
}
if (!$DotNetPath) { throw 'Instala el runtime ASP.NET Core 5.0 (incluye .NET 5) o indica -DotNetPath.' }

$reuseApi = Test-PortInUse 5014
if ($reuseApi) {
    try {
        $swagger = Invoke-RestMethod -Uri "$apiUrl/swagger/v1/swagger.json" -TimeoutSec 10
        if (@($swagger.paths.PSObject.Properties.Name) -notcontains '/Test/GenerateExcel') {
            throw 'No corresponde a esta demo.'
        }
    } catch {
        throw 'El puerto 5014 esta ocupado por una API que no se reconoce. Libera ese puerto antes de ejecutar la demo.'
    }
}
while (Test-PortInUse $FrontendPort) {
    if ($FrontendPort -eq 65535) { throw 'No se ha encontrado un puerto libre para Angular.' }
    $FrontendPort++
}

Write-Host "Node: $nodeVersion ($NodePath)"
Write-Host "SDK .NET: $sdkVersion ($sdkPath)"
Write-Host "Runtime .NET 5: $DotNetPath"
Write-Host "API: $apiUrl (reutilizar instancia: $reuseApi)"
Write-Host "Demo: http://localhost:$FrontendPort/home"
if ($CheckOnly) {
    Write-Host 'Requisitos comprobados. No se han instalado paquetes ni iniciado servidores.'
    return
}

$env:PATH = (Split-Path -Parent $NodePath) + ';' + $env:PATH
Push-Location $frontendDirectory
try {
    if (!(Test-Path -LiteralPath $angularCli -PathType Leaf)) {
        $npmCli = Join-Path (Split-Path -Parent $NodePath) 'node_modules\npm\bin\npm-cli.js'
        if (!(Test-Path -LiteralPath $npmCli -PathType Leaf)) { throw 'No se encuentra npm junto a Node. Instala las dependencias con npm ci.' }
        Invoke-Checked $NodePath @($npmCli, 'ci')
    }
    if (!$SkipBuild) {
        Invoke-Checked $NodePath @($angularCli, 'build', 'ecs-primeng-table')
        if (!$reuseApi) { Invoke-Checked $sdkPath @('build', $backendProject, '--configuration', 'Debug', '--nologo') }
    }
    if (!(Test-Path -LiteralPath (Join-Path $frontendDirectory 'dist\ecs-primeng-table\package.json'))) {
        throw 'Falta compilar la libreria Angular. Ejecuta el script sin -SkipBuild.'
    }
    if (!$reuseApi) {
        if (!(Test-Path -LiteralPath $backendAssembly -PathType Leaf)) {
            throw 'Falta compilar la API. Ejecuta el script sin -SkipBuild.'
        }
        $apiCommand = '& ' + (ConvertTo-Quoted $DotNetPath) + ' ' + (ConvertTo-Quoted $backendAssembly) +
            ' --urls ' + (ConvertTo-Quoted $apiUrl) + ' --contentRoot ' + (ConvertTo-Quoted $backendDirectory)
        Start-DemoWindow 'Demo - API .NET 5' $backendDirectory $apiCommand
    }
    $frontendCommand = '& ' + (ConvertTo-Quoted $NodePath) + ' ' + (ConvertTo-Quoted $angularCli) +
        " serve ECSPrimengTable --configuration development --host localhost --port $FrontendPort"
    if (!$NoBrowser) { $frontendCommand += ' --open' }
    Start-DemoWindow 'Demo - Angular 14' $frontendDirectory $frontendCommand
    if (!$NoBrowser) { Write-Host 'Angular abrira el navegador cuando termine de compilar.' }
    Write-Host 'Usa Ctrl+C en cada ventana para detener los servidores.'
    Write-Host 'La API utiliza la conexion SQL Server configurada en Backend/ECSPrimengTableExample/appsettings*.json.'
} finally {
    Pop-Location
}