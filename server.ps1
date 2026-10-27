param([int]$Port = 8000)

$Root = $PSScriptRoot
if (-not $Root) { $Root = (Get-Location).Path }

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".webp" = "image/webp"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".mp3"  = "audio/mpeg"
    ".ogg"  = "audio/ogg"
    ".wav"  = "audio/wav"
}

$listener = New-Object System.Net.HttpListener

# Find available port
$bound = $false
for ($p = $Port; $p -lt ($Port + 10); $p++) {
    try {
        $prefix = "http://localhost:$p/"
        $listener.Prefixes.Clear()
        $listener.Prefixes.Add($prefix)
        $listener.Start()
        $Port = $p
        $bound = $true
        break
    } catch {
        # Port might be in use, try next
    }
}

if (-not $bound) {
    Write-Host "[Loi] Khong the mo cong mang tu $Port den $($Port + 9)." -ForegroundColor Red
    exit 1
}

$url = "http://localhost:$Port/"
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  ÉTHÉRÉ ATELIER — MAY CHU CUC BO WINDOWS (KHONG CAN NODE.JS)" -ForegroundColor Yellow
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  May chu dang chay tai: $url" -ForegroundColor Green
Write-Host "  Thu muc goc: $Root" -ForegroundColor Gray
Write-Host "  (Nhan Ctrl + C de dung may chu)" -ForegroundColor Gray
Write-Host "===================================================================" -ForegroundColor Cyan

# Open default browser
try {
    Start-Process $url
} catch {
    # Non-blocking if running headless
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = $request.Url.LocalPath.TrimStart('/')
        if (-not $rawPath -or $rawPath -eq "") {
            $rawPath = "index.html"
        }
        $rawPath = [System.Uri]::UnescapeDataString($rawPath).Replace('/', '\')
        $filePath = Join-Path $Root $rawPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $mime = $mimeTypes[$ext]
            }
            $response.ContentType = $mime
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "no-cache")

            try {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $response.StatusCode = 500
            }
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
