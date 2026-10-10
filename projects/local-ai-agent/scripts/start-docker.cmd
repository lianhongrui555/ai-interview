@echo off
REM 将 Docker 自己的配置位置指向 D 盘，避免使用无法访问的加密目录。
set "APPDATA=D:\DockerDesktopData\Roaming"
set "LOCALAPPDATA=D:\DockerDesktopData\Local"
REM 启动 Docker Desktop 主程序。
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
