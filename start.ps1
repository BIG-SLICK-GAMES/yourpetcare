$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
    python -m venv .venv
    & '.\.venv\Scripts\python.exe' -m pip install -r requirements.lock.txt
}
& '.\.venv\Scripts\python.exe' scripts/setup_local.py
& '.\.venv\Scripts\python.exe' run_local.py
