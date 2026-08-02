@echo off
echo ===================================================
echo   GermanPass - Test flow emails marketing
echo ===================================================
echo.
echo Lancement du test dans WSL (Debian)...
echo.

:: Lance le script via WSL Debian
wsl -d Debian -e bash -c "cd ~/daf-saas && npx tsx test-marketing.ts 2>&1"

echo.
echo Appuyez sur une touche pour fermer...
pause > nul
