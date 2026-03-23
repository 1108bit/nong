@echo off
chcp 65001 >nul
REM NoStepBack Apps Script 배포 스크립트 (Windows)

echo.
echo [*] NoStepBack 배포 시작...
echo.

REM 1. 코드 동기화
echo [>>] 코드 업로드 중...
call clasp push

if errorlevel 1 (
    echo.
    echo [X] 코드 업로드 실패
    pause
    exit /b 1
)

REM 2. 버전 생성 및 기존 배포 업데이트 (기존 URL 유지)
echo.
echo [o] 새로운 버전 생성 중...
call clasp version "Auto Update"
echo [o] 배포 업데이트 중...
call clasp deploy -i AKfycbxgoannrkzyrAaIF8FeJP-ZJyFUrhdtT1d_iJdrY0JiJwqebPYbToS5r-nUYp6Ow-2fYw

if errorlevel 1 (
    echo.
    echo [X] 배포 실패
    pause
    exit /b 1
)

echo.
echo [OK] 배포 완료!
echo [>>] 앱 바로가기: https://script.google.com/macros/s/AKfycbxgoannrkzyrAaIF8FeJP-ZJyFUrhdtT1d_iJdrY0JiJwqebPYbToS5r-nUYp6Ow-2fYw/exec
echo.
pause
