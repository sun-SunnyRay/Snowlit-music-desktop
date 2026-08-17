@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cd /d D:\XueMusic\desktop\XueMusic-desktop
if "%1"=="" (
  npm run dev
) else (
  %*
)
