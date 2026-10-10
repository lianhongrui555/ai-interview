@echo off
chcp 65001 >nul
rem 进入脚本所在的 yolo-project 目录。
cd /d "%~dp0"
rem 使用项目独立环境启动 YOLO 网页服务。
".venv\Scripts\python.exe" -X utf8 web_app.py
rem 服务停止后保留窗口，方便查看错误信息。
pause
