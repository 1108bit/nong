@echo off
chcp 65001 >nul
git add . && git commit -m "auto deploy" && git push origin main

if %errorlevel% neq 0 (
    echo 에러가 발생했습니다! 내용을 확인하세요.
    pause
)