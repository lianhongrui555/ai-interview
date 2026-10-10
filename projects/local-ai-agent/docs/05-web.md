# Web 应用

## 安装依赖

```powershell
pip install requests Flask python-dotenv
```

## 启动

```powershell
cd app
python -X utf8 web_app.py
```

打开：

```text
http://127.0.0.1:5000/
```

## 局域网访问

```powershell
$env:WEB_HOST = "0.0.0.0"
$env:WEB_PORT = "5000"
python -X utf8 web_app.py
```

手机访问时使用电脑局域网 IP。Windows 防火墙需要只允许本地子网访问 5000 端口。
