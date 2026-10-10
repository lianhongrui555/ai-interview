# Dify 部署与配置

## 1. 安装 WSL2 和 Docker Desktop

以管理员身份运行：

```powershell
wsl --install --no-distribution
```

重启后安装 Docker Desktop：

https://www.docker.com/products/docker-desktop/

## 2. 下载 Dify

```powershell
git clone https://github.com/langgenius/dify.git
cd dify/docker
Copy-Item .env.example .env
docker compose up -d
```

打开：

```text
http://localhost/install
```

创建本地管理员账号。

## 3. 安装 Ollama 插件

进入：

```text
设置 → 模型供应商 → Marketplace
```

安装作者为 `langgenius` 的 Ollama 插件。

## 4. 添加模型

### 对话模型

```text
模型名称：qwen2.5:7b
模型类型：LLM
基础 URL：http://host.docker.internal:11434
上下文长度：32768
最大 token：4096
Vision：否
函数调用：是
```

### 嵌入模型

```text
模型名称：bge-m3
模型类型：TEXT EMBEDDING
基础 URL：http://host.docker.internal:11434
上下文长度：8192
```

## 5. 创建知识库

上传 `knowledge-base/knowledge_test.txt`，使用 `bge-m3` 进行高质量索引。

## 6. 创建 Chatflow

```text
开始
→ 条件分支
    ├─ IF：包含 + - * / ^ %
    │   → Maths 工具
    │   → 直接回复
    └─ ELSE
        → 知识库检索
        → LLM：qwen2.5:7b
        → 直接回复
```

发布后创建 API Key，用于 Python 后端。
