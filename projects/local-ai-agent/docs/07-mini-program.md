# 微信小程序

## 开发环境

安装微信开发者工具：

https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

使用测试号导入 `mini-program` 目录。

## 本地模式

小程序默认访问：

```text
http://127.0.0.1:5000/api/chat
```

开发者工具中关闭合法域名校验：

```text
详情 → 本地设置 → 不校验合法域名
```

## 真机模式

1. 手机和电脑连接同一个 Wi-Fi。
2. Flask 使用 `WEB_HOST=0.0.0.0` 启动。
3. 把 `pages/chat/chat.js` 中的 API URL 改成电脑局域网 IP。
4. 在 Windows 防火墙中仅允许本地子网访问 5000 端口。
5. 点击微信开发者工具“真机调试”并扫码。

正式发布需要正式 AppID、公网 HTTPS 域名、request 合法域名和微信审核。
