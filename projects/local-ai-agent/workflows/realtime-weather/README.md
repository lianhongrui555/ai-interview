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