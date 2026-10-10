# Local AI Agent

一个使用本地 Ollama、Dify 和 Python 构建的本地智能体项目，支持 CLI、Web、桌面应用和微信小程序。

## 核心架构

```text
微信小程序 / Web / 桌面应用 / CLI
                ↓
            Flask API
                ↓
              Dify
         ┌──────┴──────┐
         ↓             ↓
   知识库检索       Maths 数学工具
         ↓             ↓
      bge-m3      qwen2.5:7b
         └──────┬──────┘
                ↓
              Ollama
```

## 已完成功能

- 本地 Ollama 部署
- Dify 本地部署
- `qwen2.5:7b` 对话模型
- `bge-m3` 中文嵌入模型
- 本地知识库和检索
- Dify Ollama 插件
- Maths 数学工具分支
- Python 单次 API 调用
- CLI 连续对话
- Flask Web 聊天
- pywebview 桌面应用
- 微信小程序模拟器和局域网真机测试
- Dify 实时天气查询工作流工具
- Flask 网站集成实时天气查询卡片

## 目录结构

```text
Local-AI-Agent/
├─ app/                    # Python API、CLI、Web、桌面应用
├─ ollama-basic/           # 最基础的 Ollama 调用示例
├─ knowledge-base/         # 知识库测试资料
├─ mini-program/           # 微信小程序
├─ workflows/              # 可导入 Dify 的工作流 DSL
├─ scripts/                # Docker 启动脚本
└─ docs/                   # 部署、使用和排错文档
```

## 快速开始

完整顺序是：

1. 安装 Ollama，并下载模型。
2. 安装 WSL2 和 Docker Desktop。
3. 部署 Dify。
4. 在 Dify 中添加 Ollama 插件、模型和知识库。
5. 复制 `app/.env.example` 为 `app/.env`，填写自己的 Dify Key。
6. 运行 CLI、Web 或桌面应用。
7. 可选：运行微信小程序。

详细步骤见：

- `docs/01-architecture.md`
- `docs/02-ollama.md`
- `docs/03-dify.md`
- `docs/04-cli.md`
- `docs/05-web.md`
- `docs/06-desktop.md`
- `docs/07-mini-program.md`
- `docs/08-troubleshooting.md`
- `docs/09-engineering-log-2026-10-03.md`
- `docs/10-dify-weather-tool.md`

## API Key 安全

真实 API Key 只放在本地 `app/.env` 中：

```text
DIFY_API_URL=http://localhost/v1
DIFY_API_KEY=你的本地 Dify API Key
```

不要提交：

- `.env`
- API Key
- Dify 密码
- 微信 AppSecret
- 私钥或证书
