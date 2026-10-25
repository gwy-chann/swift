<#
.SYNOPSIS
    SWIFT Strangler Gateway - Canary Upstream Weight Shifter
    SIAA-98: Dark Traffic Shadowing & Canary Traffic Ramping

.DESCRIPTION
    Dynamically adjusts NGINX upstream weights (10%, 25%, 50%, 80%, 100%)
    and reloads configuration with zero dropped connections.

.PARAMETER Stage
    Canary stage percentage (10, 25, 50, 80, 100). Default is 100.
#>

param (
    [ValidateSet(10, 25, 50, 80, 100)]
    [int]$Stage = 100
)

$springWeight = $Stage
$nextjsWeight = 100 - $Stage

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "SWIFT Strangler Gateway: Shifting Canary Stage to STAGE_$Stage" -ForegroundColor Cyan
Write-Host "Spring Boot Target Weight: $springWeight%" -ForegroundColor Green
Write-Host "Next.js Target Weight:    $nextjsWeight%" -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Cyan

$confPath = "$PSScriptRoot/nginx-strangler-gateway.conf"
if (-not (Test-Path $confPath)) {
    Write-Error "NGINX configuration file not found at: $confPath"
    exit 1
}

$conf = Get-Content $confPath -Raw

# Update weights
$conf = $conf -replace "add_header X-Swift-Canary-Stage \`"STAGE_\d+\`"", "add_header X-Swift-Canary-Stage `"STAGE_$Stage`""

if ($Stage -eq 100) {
    $canaryPool = @"
    upstream canary_pool {
        server swift-backend:8080 weight=100 max_fails=2 fail_timeout=5s;
        server host.docker.internal:3000 weight=0 backup;
        server 127.0.0.1:8080 backup;
    }
"@
} else {
    $canaryPool = @"
    upstream canary_pool {
        server swift-backend:8080 weight=$springWeight max_fails=2 fail_timeout=5s;
        server host.docker.internal:3000 weight=$nextjsWeight max_fails=3 fail_timeout=10s;
        server 127.0.0.1:8080 backup;
    }
"@
}

$conf = [regex]::Replace($conf, '(?s)upstream canary_pool \{.*?\}', $canaryPool.Trim())
Set-Content -Path $confPath -Value $conf -NoNewline

Write-Host "Configuration updated successfully." -ForegroundColor Green
Write-Host "To reload NGINX container without downtime:" -ForegroundColor Yellow
Write-Host "  docker compose exec gateway nginx -s reload" -ForegroundColor White
