# CLI 使用

## 配置

```powershell
cd app
Copy-Item .env.example .env
notepad .env
```

填写 Dify API Key。

## 单次调用

```powershell
python -X utf8 first_dify_call.py
```

## 连续对话

```powershell
python -X utf8 chat_cli.py
```

命令：

- `/new`：开始新对话
- `/help`：帮助
- `/exit`：退出
