# 源代码目录

本目录存放项目源代码。各文件职责：

| 文件 | 职责 | 状态 |
|---|---|---|
| `main.py` | 程序入口，CLI 交互循环 | 待 Day 3 实现 |
| `llm_client.py` | 封装与本地 Ollama 的 HTTP 通信 | 待 Day 2 实现 |
| `agent.py` | 智能体逻辑：系统提示词、对话历史组装、工具调用 | 待 Day 5 实现 |
| `storage.py` | 对话历史的 JSON 读写 | 待 Day 4 实现 |
| `config.py` | 配置读取（模型名、服务地址等） | 待 Day 2 实现 |

设计说明见 [`../docs/技术方案.md`](../docs/技术方案.md)。
