# Ollama 安装与模型

## 安装

从官方地址下载：

https://ollama.com/download

安装后确认：

```powershell
ollama --version
```

## 下载模型

```powershell
ollama pull qwen2.5:7b
ollama pull bge-m3
```

查看模型：

```powershell
ollama list
```

## 接口检查

```powershell
Invoke-RestMethod http://127.0.0.1:11434/api/version
```

默认地址：

```text
http://127.0.0.1:11434
```

Docker 中的 Dify 不能使用 `127.0.0.1` 访问宿主 Ollama，应使用：

```text
http://host.docker.internal:11434
```
