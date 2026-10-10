# 桌面应用

使用 `pywebview` 把 Web 页面嵌入独立桌面窗口。

## 安装

```powershell
pip install pywebview
```

## 启动

```powershell
cd app
python -X utf8 desktop_app.py
```

桌面程序会在后台线程启动 Flask，并自动选择空闲端口。

## 创建快捷方式

目标程序使用：

```text
D:\python\pythonw.exe
```

参数：

```text
"C:\路径\app\desktop_app.py"
```

这样双击快捷方式时不会显示命令行黑窗。
