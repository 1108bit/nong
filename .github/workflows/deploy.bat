@echo off
chcp 65001 >nul
echo.
echo [*] LEGION MANAGER 강제 배포 시작...
echo [*] AION2 · 그림자 강제 배포 시작...

REM 1. 코드 강제 업로드 (index.html 포함 확인 필수)
echo [>>] 코드 강제 업로드 중...
call clasp push --force

if errorlevel 1 (
    echo [X] 업로드 실패: .clasp.json이나 로그인 상태를 확인하세요.
    pause
    exit /b 1
)

REM 2. 배포 업데이트 (버전 생성과 배포를 한 번에)
echo.
echo [o] 라이브 사이트(ID: AKfycbx...) 업데이트 중...
:: -i 옵션 뒤에 ID를 쓰고, -d로 메모를 남기면 구글이 새 버전을 자동으로 할당합니다.
call clasp deploy -i AKfycbxgoannrkzyrAaIF8FeJP-ZJyFUrhdtT1d_iJdrY0JiJwqebPYbToS5r-nUYp6Ow-2fYw -d "Manual Batch Update"

if errorlevel 1 (
    echo [X] 배포 실패: 배포 ID가 정확한지 확인하세요.
    pause
    exit /b 1
)

echo.
echo [OK] 모든 작업 완료! 
echo [!] 지금 바로 사이트에서 '강력 새로고침(Ctrl+Shift+R)' 하세요.
pause