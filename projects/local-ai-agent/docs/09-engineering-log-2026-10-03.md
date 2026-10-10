# 2026-10-03 本地 AI 智能体工程日志

## 今日目标

- 打通 Ollama → Dify → Flask 最小调用闭环。
- 完成 CLI、Web、桌面端调用原型。
- 在 Chatflow 中加入知识库和 Maths 工具。
- 验证微信小程序模拟器和真机聊天。

## 完成内容

1. Ollama 正常运行，`qwen2.5:1.5b`、`qwen2.5:7b` 和 `bge-m3` 可用。
2. 安装 WSL2、Docker Desktop，部署 Dify。
3. 添加 Ollama 插件、`qwen2.5:7b`、`bge-m3` 和知识库。
4. 完成 Python 单次调用、CLI、Web、pywebview 桌面应用。
5. 完成 Dify Chatflow、条件分支和 Maths 工具。
6. 完成微信小程序模拟器和局域网真机测试。

## 遇到的问题

### Docker 配置目录加密

- 原因：C 盘用户配置目录启用了 EFS。
- 解决：不修改旧目录，把 Docker 配置迁移到 D 盘并增加专用启动脚本。

### 知识库检索错误

- 原因：文本按行切成过短的知识块。
- 解决：调整切分和检索参数，保留完整上下文。

### Dify Agent 不支持 Qwen2

- 原因：Dify 新版 Agents Beta 把 Qwen2 系列标记为不兼容。
- 解决：使用 Chatflow 条件分支和工具节点。

### Ollama 工具消息格式错误

- 原因：OpenAI 风格工具参数和 Ollama 原生格式不同。
- 解决：工具参数使用对象，工具结果使用 `tool_name`。

## 当前状态

- CLI、Web、桌面、小程序均已完成本地测试。
- 正式小程序发布仍需要正式 AppID、公网 HTTPS 域名和微信审核。
