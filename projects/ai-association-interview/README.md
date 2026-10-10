# 人工智能协会创智部二面项目

> 作者：lianhongrui
> 开始日期：2026-09-29

## 项目简介

本项目为人工智能协会创智部二面实战部分作业。

核心目标：**完成本地大模型的部署，将其作为 model provider 通过 API 接入自建应用。**

## 任务范围说明（做的减法）

题目给出了五个任务方向（大模型、YOLO、硬件结合、Harness、创意作品）。
经过权衡，**本项目集中精力只做任务一，并把工程质量做扎实**。

理由：

> 题目原文明确指出："AI 会不断地把事情变繁琐，而你**需要为你的事情做减法**，
> 而不是不断的增加噪声。"

与其三个任务都浅尝辄止、留下一地鸡毛，不如把一件事做完整、做干净，
让工程结构、文档、版本记录都能被清楚地复现。

同时，任务四（Harness 搭建）**以理解文档的形式呈现**，不写代码，
见 [`docs/Harness理解.md`](docs/Harness理解.md)。

## 硬件与模型选型

| 部件 | 配置 |
|---|---|
| CPU | AMD Ryzen 9 8945HX (32 线程) |
| 内存 | 32 GB |
| 显卡 | NVIDIA RTX 5070 Ti Laptop GPU (12 GB 显存) |
| 系统 | Windows 11 |

选型结论：12 GB 显存可完整承载 7B 级模型（Q4 量化），
实测 **29/29 层全部offload 到 GPU**，生成速度 **81.7 tokens/秒**。

## 环境要求

- Windows 10/11
- Python 3.10+
- [Ollama](https://ollama.com/download)（本地模型运行时）
- Git

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 拉取模型（首次需要，约 4.7 GB）
ollama pull qwen2.5:7b

# 3. 确认 Ollama 服务在运行
ollama list

# 4. 运行本项目
python src/main.py
```

## 项目结构

```
ai-association-interview/
├── README.md              # 本文件
├── requirements.txt       # Python 依赖
├── .gitignore
├── docs/
│   ├── 工程日志.md         # 每日进度与卡点记录
│   ├── 技术方案.md         # 实现思路
│   ├── Harness理解.md      # 任务四：对 Harness 的理解
│   └── AI使用说明.md       # AI 使用情况如实说明
├── src/                   # 源代码
└── screenshots/           # 运行截图
```

## 当前进度

- [x] Day 1：环境搭建、本地大模型部署、GPU 加速验证
- [ ] Day 2：Python 调用本地模型 API
- [ ] Day 3：CLI 对话程序
- [ ] Day 4：数据持久化与异常处理
- [ ] Day 5：智能体人设与系统提示词
- [ ] Day 6：工具调用与多模型对比
- [ ] Day 7：创意功能与代码整理
- [ ] Day 8：文档完善
- [ ] Day 9：演示讲稿与演练

详细计划见 [`docs/工程日志.md`](docs/工程日志.md)。
