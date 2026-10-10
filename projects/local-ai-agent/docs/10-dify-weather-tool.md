# Dify 实时天气查询工作流工具

这是一个可直接导入 Dify 的天气查询工作流，输入城市名称后返回当前天气、气温、体感温度、湿度和风速。

## 特点

- 不需要天气 API Key
- 使用免费的 Open-Meteo 接口
- 支持中文城市名称
- 可作为 Dify 工作流工具被 Agent 或 Chatflow 调用
- 导出 DSL 中不包含任何密钥或隐私信息

## 工作流结构

```text
用户输入 city
    ↓
HTTP 请求 1：城市名称转经纬度
    ↓
代码 1：提取纬度、经度、城市、省份、国家
    ↓
HTTP 请求 2：使用经纬度查询当前天气
    ↓
代码 2：把天气代码整理成中文
    ↓
结束：输出 weather_text、temperature、humidity、wind_speed、description
```

## 外部接口

### 城市定位

```text
GET https://geocoding-api.open-meteo.com/v1/search
```

参数：

```text
name={{city}}
count=1
language=zh
format=json
```

### 当前天气

```text
GET https://api.open-meteo.com/v1/forecast
```

参数：

```text
latitude={{latitude}}
longitude={{longitude}}
current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m
temperature_unit=celsius
wind_speed_unit=kmh
timezone=auto
```

## 导入 Dify

1. 打开本地 Dify。
2. 进入应用或工作流导入页面。
3. 选择本目录的 `realtime-weather.dsl.yml`。
4. 导入后检查工作流是否有 6 个节点：开始、2 个 HTTP 请求、2 个代码节点、结束。
5. 点击运行，输入 `广州`。
6. 确认温度、湿度和风速不是 0，天气描述不是“未知天气”。
7. 点击“发布”或“发布为工具”。

不同 Dify 版本的菜单文字可能略有差异，优先在“工作室”或“工具”页面寻找“导入 DSL”入口。

## 测试示例

输入：

```text
北京
```

可能输出：

```json
{
  "weather_text": "中国 北京市 北京当前天气：晴朗；气温 20.9°C；体感温度 21.0°C；相对湿度 40%；风速 8.2 km/h；数据时间 2026-10-08T20:15。",
  "temperature": 20.9,
  "humidity": 40.0,
  "wind_speed": 8.2,
  "description": "晴朗"
}
```

## 常见问题

### 所有温度和湿度都是 0

检查第二个 HTTP 请求节点是否包含：

```text
current:temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m
```

它必须放在 Params 中，不能放在 Headers 中。

### 报错 Not all output parameters are validated

规则是：代码 `return` 中的字段必须和 Dify 输出变量列表完全一致。

第一个代码节点返回：

```text
found
latitude
longitude
city_name
admin1
country
```

第二个代码节点返回：

```text
weather_text
temperature
humidity
wind_speed
description
```

不要多，也不要少。

## 嵌入本地 Flask 网站

本地 Flask 网站已经增加 `POST /api/weather` 接口和主页天气卡片。

### 配置天气工作流 API Key

1. 打开 Dify。
2. 进入“实时天气查询——工具”应用。
3. 打开 API 访问页面。
4. 创建一个天气工作流专用 API Key。
5. 复制 `app/.env.example` 为 `app/.env`。
6. 在 `app/.env` 中填写：

```text
DIFY_API_URL=http://localhost/v1
DIFY_API_KEY=你的聊天应用APIKey
DIFY_WEATHER_API_KEY=你的天气工作流APIKey
WEB_HOST=127.0.0.1
WEB_PORT=5000
```

### 启动网站

```powershell
cd "D:\Local-AI-Agent\app"
D:\python\python.exe -X utf8 web_app.py
```

浏览器打开：

```text
http://127.0.0.1:5000/
```

页面顶部会显示“实时天气查询”卡片，输入城市即可查询天气。

### 局域网访问

把 `app/.env` 中的监听地址改为：

```text
WEB_HOST=0.0.0.0
```

重启网站后，同一局域网设备可以访问：

```text
http://电脑局域网IP:5000/
```

### 安全说明

- Dify API Key 只放在服务器端 `.env` 中。
- `.env` 已被 `.gitignore` 忽略，不应上传 GitHub。
- 浏览器只请求本地 `/api/weather`，不会拿到 Dify API Key。
