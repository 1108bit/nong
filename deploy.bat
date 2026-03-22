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

REM 2. 배포
echo.
echo [o] 배포 중...
call clasp deploy

if errorlevel 1 (
    echo.
    echo [X] 배포 실패
    pause
    exit /b 1
)

echo.
echo [OK] 배포 완료!
echo [>>] 앱 바로가기: https://script.google.com/macros/d/AKfycbwOlszRW-sCVG7WH8hlWcwULUqg44KNg2u3ASgp16itsVEZpfRtNoFGnkiB0-uqBIqnFA/usercallable
echo.
pause
