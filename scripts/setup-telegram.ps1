param([Parameter(Mandatory=$true)][string]$BaseUrl)
$ErrorActionPreference = "Stop"

if (Test-Path -LiteralPath ".env") {
  Get-Content -LiteralPath ".env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
      $key, $value = $line.Split("=", 2)
      [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
    }
  }
}

$token = $env:TELEGRAM_BOT_TOKEN
$secret = $env:TELEGRAM_WEBHOOK_SECRET
if (-not $token -or -not $secret) { throw "Set TELEGRAM_BOT_TOKEN dan TELEGRAM_WEBHOOK_SECRET terlebih dahulu." }
$uri = "https://api.telegram.org/bot$token/setWebhook"
$body = @{ url = "$($BaseUrl.TrimEnd('/'))/api/telegram/webhook"; secret_token = $secret; allowed_updates = @("message", "chat_member") } | ConvertTo-Json
$result = Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $body
$result | ConvertTo-Json -Depth 5

$info = Invoke-RestMethod -Method Get -Uri "https://api.telegram.org/bot$token/getWebhookInfo"
$info | ConvertTo-Json -Depth 5
