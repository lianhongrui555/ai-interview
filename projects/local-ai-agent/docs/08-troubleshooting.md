# 常见问题

## Docker 配置目录被 EFS 加密

现象：Docker Desktop 无法保存设置。

解决：保持旧配置不动，把 Docker 配置迁移到未加密目录，并使用专用启动脚本。

## Redis 密码不一致

改为随机密码后，`CELERY_BROKER_URL` 必须同步修改，否则 Dify Worker 会报 Redis 认证失败。

## 知识库只检索到部分内容

避免把一行文字切成一个独立小块。数据较少时可以提高 Top K，或把完整信息放入一个连续段落。

## Dify 新版 Agents 不支持 Qwen2

Dify 新版 Agents Beta 会标记 `qwen2` 模型不兼容。解决方式是使用 Chatflow 条件分支和 Tool 节点，而不是新版 Agent 页面。

## Docker 无法访问 Ollama

在 Dify 内填写：

```text
http://host.docker.internal:11434
```

不要填写 `127.0.0.1`。
