@echo off
chcp 65001 >nul
rem 进入 V2 脚本所在目录。
cd /d "%~dp0"
rem 使用项目独立环境启动 V2 网页服务。
"..\.venv\Scripts\python.exe" -X utf8 web_app_v2.py
rem 服务停止后保留窗口，方便查看错误信息。
pause
