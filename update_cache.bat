@echo off
chcp 65001 >nul
echo.
echo [*] HTML 캐시 버전(v=?) 자동 갱신 봇 가동...

:: PowerShell을 사용하여 현재 시간을 가져오고, 모든 HTML 파일의 v=... 을 안전하게 일괄 교체
powershell -Command "$timestamp = Get-Date -Format 'yyyyMMddHHmmss'; Write-Host '[i] 생성된 새로운 캐시 버전: v=' $timestamp; Get-ChildItem -Path '.' -Filter '*.html' | ForEach-Object { $content = Get-Content $_.FullName -Raw; $newContent = $content -replace 'v=[a-zA-Z0-9,~]+', ('v=' + $timestamp); Set-Content -Path $_.FullName -Value $newContent -Encoding UTF8 }"

echo [OK] 모든 HTML 파일의 버전표가 일괄 갱신되었습니다!
echo.
echo [!] 이제 이 상태로 Git에 커밋하고 푸쉬하시면,
echo     유저들의 브라우저 캐시가 100%% 파괴되고 최신 화면이 즉각 반영됩니다.
pause