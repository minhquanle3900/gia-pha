@echo off
setlocal
set "app_arch=%PROCESSOR_ARCHITECTURE%"
if defined PROCESSOR_ARCHITEW6432 set "app_arch=%PROCESSOR_ARCHITEW6432%"
set "launcher="
if /i "%app_arch%"=="AMD64" set "launcher=GiftEdition-x64.exe"
if /i "%app_arch%"=="ARM64" set "launcher=GiftEdition-arm64.exe"
if not defined launcher (
  echo Gift Edition requires 64-bit Windows on x64 or ARM64.
  pause
  exit /b 1
)
if not exist "%~dp0%launcher%" (
  echo Extract the entire ZIP before opening Gift Edition.
  pause
  exit /b 1
)
"%~dp0%launcher%"
if errorlevel 1 (
  pause
  exit /b 1
)
