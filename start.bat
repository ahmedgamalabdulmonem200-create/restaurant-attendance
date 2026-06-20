@echo off
echo تثبيت الحزم...
cd backend && npm install
cd ../frontend && npm install
echo.
echo تشغيل السيرفر...
start "Backend" cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak > nul
start "Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo البرنامج يعمل على:
echo   الموظفون: http://localhost:5173
echo   الإدارة:   http://localhost:5173/admin
echo   (كلمة المرور: admin1234)
