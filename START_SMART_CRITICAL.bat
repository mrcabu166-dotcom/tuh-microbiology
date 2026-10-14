@echo off
chcp 65001 > nul
title Smart Critical Microbiology Alert - Thammasat University Hospital

if exist "%~dp0web app" (
    cd /d "%~dp0web app"
) else (
    cd /d "%~dp0"
)

echo ==============================================================================
echo  🏥 Smart Critical Microbiology Alert ^& AMR Surveillance System
echo  โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ (TUH)
echo ==============================================================================
echo.
echo กำลังเริ่มต้นระบบ Web Application และ Telegram Bot...
echo.

echo เปิดเบราว์เซอร์ไปที่: http://localhost:3000
start http://localhost:3000

echo เริ่มต้น Next.js Server...
call npm run dev

pause
