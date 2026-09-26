# Run in an Administrator PowerShell if the phone cannot reach the local preview.
$ErrorActionPreference = 'Stop'
$phoneRuleName = 'Your Pet Care phone preview TCP 8000'
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Open PowerShell as Administrator, then run: & "E:\yourpetcare\allow-phone.ps1"'
}
if (-not (Get-NetFirewallRule -DisplayName $phoneRuleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $phoneRuleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000 -LocalAddress 192.168.0.109 -RemoteAddress 192.168.0.0/24 -Profile Any -Program 'C:\Python312\python.exe' | Out-Null
}
Write-Host 'Phone preview: http://192.168.0.109:8000 (same Wi-Fi/router).'
