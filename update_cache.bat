@echo off
chcp 65001 >nul
echo.
echo [*] HTML 캐시 버전(v=?) 자동 갱신 봇 가동...

:: PowerShell에서 UTF-8 인코딩을 강제하여 한글 깨짐(Mojibake) 완벽 방지
powershell -Command "$timestamp = Get-Date -Format 'yyyyMMddHHmmss'; Write-Host '[i] 생성된 새로운 캐시 버전: v=' $timestamp; Get-ChildItem -Path '.' -Filter '*.html' | ForEach-Object { $content = Get-Content $_.FullName -Encoding UTF8 -Raw; $newContent = $content -replace 'v=[a-zA-Z0-9,~]+', ('v=' + $timestamp); [IO.File]::WriteAllText($_.FullName, $newContent, [System.Text.Encoding]::UTF8) }"

echo [OK] 모든 HTML 파일의 버전표가 일괄 갱신되었습니다!
echo.
echo [!] 이제 이 상태로 Git에 커밋하고 푸쉬하시면,
echo     유저들의 브라우저 캐시가 100%% 파괴되고 최신 화면이 즉각 반영됩니다.
pause