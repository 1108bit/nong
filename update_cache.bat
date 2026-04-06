@echo off
chcp 65001 >nul
echo.
echo [*] HTML 캐시 버전(v=?) 자동 갱신 봇 가동...

:: 현재 시간을 기반으로 고유 타임스탬프 생성 (예: 20240308153012)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "NEW_VER=%datetime:~0,14%"

echo [i] 생성된 새로운 캐시 버전: v=%NEW_VER%
echo.

:: PowerShell을 사용하여 현재 폴더의 모든 html 파일 내 'v=숫자'를 'v=새버전'으로 일괄 교체
powershell -Command "Get-ChildItem -Path '.' -Filter '*.html' | ForEach-Object { $content = Get-Content $_.FullName -Raw; $newContent = $content -replace 'v=[0-9]+', 'v=%NEW_VER%'; Set-Content -Path $_.FullName -Value $newContent -Encoding UTF8 }"

echo [OK] 모든 HTML 파일의 버전표가 일괄 갱신되었습니다!
echo.
echo [!] 이제 이 상태로 Git에 커밋하고 푸쉬하시면,
echo     유저들의 브라우저 캐시가 100%% 파괴되고 최신 화면이 즉각 반영됩니다.
pause