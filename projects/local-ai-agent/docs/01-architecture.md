# 架构说明

## 分层设计

### 1. 模型层

- Ollama 运行本地模型。
- `qwen2.5:7b` 负责对话、知识库回答和数学工具流程。
- `bge-m3` 负责中文文本向量化。

### 2. 智能体层

Dify 提供：

- 模型供应商管理
- 知识库
- Chatflow
- 条件分支
- Maths 工具
- API Key 和应用 API

最终 Chatflow：

```text
开始
→ 条件分支
    ├─ IF 包含 + - * / ^ %
    │   → Maths 工具
    │   → 直接回复
    └─ ELSE
        → 知识库检索
        → LLM
        → 直接回复
```

### 3. 后端层

Flask 负责：

- 隐藏 Dify API Key
- 接收网页、桌面和小程序请求
- 转发到 Dify
- 返回统一 JSON

### 4. 客户端层

- CLI：终端连续聊天
- Web：浏览器聊天页面
- Desktop：pywebview 桌面窗口
- 微信小程序：手机聊天界面

## 数据流

```text
用户输入
→ 客户端
→ Flask /api/chat
→ Dify /chat-messages
→ 条件分支
→ 知识库或 Maths 工具
→ qwen2.5:7b
→ 返回答案
```
