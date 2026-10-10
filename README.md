# AI面试项目合集

这个仓库把多个独立的 AI 项目集中在一起，方便面试展示、统一浏览和后续维护。

> `AI-Learning-Workbench` 保持独立，不包含在本仓库中。

## 项目目录

| 项目 | 目录 | 技术重点 |
|---|---|---|
| Local AI Agent | `projects/local-ai-agent/` | Ollama、Dify、Flask、Web、桌面端、微信小程序 |
| CodeHarness | `projects/code-harness/` | Agent Loop、工具调用、会话、Git 与文件工具 |
| YOLO Detection | `projects/yolo-detection/` | YOLO 训练、验证、Flask 摄像头实时推理 |
| AI Association Interview | `projects/ai-association-interview/` | 本地大模型部署、API 接入、工程文档 |
| Alchemy Arena | `projects/alchemy-arena/` | TypeScript、Web 游戏、AI 辅助开发实践 |

## 原始仓库

- [Local-AI-Agent](https://github.com/lianhongrui555/Local-AI-Agent)
- [CodeHarness](https://github.com/lianhongrui555/CodeHarness)
- [YOLO-Detection](https://github.com/lianhongrui555/YOLO-Detection)
- [ai-association-interview](https://github.com/lianhongrui555/ai-association-interview)
- [alchemy-arena](https://github.com/lianhongrui555/alchemy-arena)

## 仓库结构

```text
ai-interview/
├─ README.md
└─ projects/
   ├─ local-ai-agent/
   ├─ code-harness/
   ├─ yolo-detection/
   ├─ ai-association-interview/
   └─ alchemy-arena/
```

## 快速导航

### Local AI Agent

本地 AI 助手项目，包含 CLI、Web、桌面应用、微信小程序、知识库、天气工作流和 Dify 集成。

### CodeHarness

面向代码项目的本地 AI Agent Harness，重点是可循环决策、工具调用、会话保存和可观察性。

### YOLO Detection

从数据训练、模型评估到 Flask 浏览器摄像头推理的完整计算机视觉项目。

### AI Association Interview

人工智能协会二面项目，重点是把本地大模型作为 model provider 接入自建应用。

### Alchemy Arena

桌面浏览器炼金卡牌对战游戏，包含卡牌融合、拖曳部署、关卡、存档、测试与 GitHub Pages。

## 使用说明

每个项目都有独立的 README、依赖和启动方式。进入对应目录后，优先阅读该目录下的 `README.md`。

## 维护说明

- 原始仓库暂不删除，保留独立历史。
- 本仓库通过 `git subtree` 合并，各个 `projects/` 子目录仍可独立更新。
- 如果某个项目后续继续开发，建议先在原仓库提交，再把更新同步到本仓库。
- 大文件、模型权重和训练结果是否提交，以各子项目原有规则为准。
- 各子项目的许可证以对应目录中的 LICENSE 或 README 说明为准。