# 导入 os 工具，用于读取 .env 中的 Dify 地址和密钥。
import os

# 导入 Path 工具，用于定位当前项目中的 .env 文件。
from pathlib import Path

# 导入 Flask 相关工具，用于创建网页服务器和返回 JSON 数据。
from flask import Flask, jsonify, render_template, request

# 导入 requests 工具包，用于向 Dify API 发送请求。
import requests

# 导入 load_dotenv 工具，用于安全读取 .env 文件。
from dotenv import load_dotenv

# 计算 .env 文件的完整路径。
env_path = Path(__file__).with_name(".env")

# 读取 .env 文件中的保密配置。
load_dotenv(dotenv_path=env_path)

# 从环境变量读取 Dify API 基础地址。
api_url = os.getenv("DIFY_API_URL")

# 从环境变量读取 Dify API Key，密钥不会发送到浏览器。
api_key = os.getenv("DIFY_API_KEY")

# 从环境变量读取天气工作流专用的 Dify API Key；它只保存在后端。
dify_weather_key = os.getenv("DIFY_WEATHER_API_KEY")

# 检查 API 地址是否已经配置。
if not api_url:
    # 如果缺少地址，就停止程序并提示用户检查 .env。
    raise SystemExit("错误：.env 中缺少 DIFY_API_URL。")

# 检查 API Key 是否存在并且不是占位文字。
if not api_key or "请在这里" in api_key:
    # 如果密钥未填写，就停止程序并给出清楚提示。
    raise SystemExit("错误：请在 .env 中填写真实的 DIFY_API_KEY。")

# 拼接 Dify 聊天接口的完整地址。
dify_endpoint = api_url.rstrip("/") + "/chat-messages"

# 拼接 Dify 天气工作流的完整地址。
dify_weather_endpoint = api_url.rstrip("/") + "/workflows/run"

# 读取后端监听地址；默认只允许本机访问，真机测试时可设为 0.0.0.0。
web_host = os.getenv("WEB_HOST", "127.0.0.1")

# 读取后端监听端口，默认使用 5000。
web_port = int(os.getenv("WEB_PORT", "5000"))
# 创建 Flask 网页应用对象。
app = Flask(__name__)

# 定义网站首页，访问根地址时显示聊天网页。
@app.get("/")
def index():
    # 从 templates 文件夹读取 index.html 并返回给浏览器。
    return render_template("index.html")
# 定义健康检查地址，访问 /health 可以确认后端是否正常工作。
@app.get("/health")
def health():
    # 返回 JSON，说明后端已经启动，同时明确不泄露 API Key。
    return jsonify({"status": "ok", "message": "Web 后端运行正常"})

# 定义聊天接口，只接受浏览器发送的 POST 请求。
@app.post("/api/chat")
def chat():
    # 读取浏览器发来的 JSON 数据；silent=True 可以避免格式错误时抛出混乱异常。
    data = request.get_json(silent=True) or {}

    # 从 JSON 中读取用户消息并去掉首尾空白。
    message = str(data.get("message", "")).strip()

    # 从 JSON 中读取已有的对话编号，没有时使用空字符串。
    conversation_id = str(data.get("conversation_id", "")).strip()

    # 如果用户没有输入内容，就返回 400 错误。
    if not message:
        # 返回清楚的中文错误，不继续调用 Dify。
        return jsonify({"error": "消息不能为空。"}), 400

    # 准备发送给 Dify 的请求头。
    headers = {
        # 在服务器端加入 Bearer API Key，浏览器无法看到它。
        "Authorization": f"Bearer {api_key}",
        # 告诉 Dify 请求正文使用 JSON 格式。
        "Content-Type": "application/json",
    }

    # 准备发送给 Dify 的数据。
    payload = {
        # 当前没有额外输入变量。
        "inputs": {},
        # query 是浏览器传来的用户问题。
        "query": message,
        # blocking 表示等待完整回答后一次返回。
        "response_mode": "blocking",
        # user 是固定的本地网页用户标识。
        "user": "local-web-user",
    }

    # 如果已有对话编号，就把它传给 Dify，让对话记住上下文。
    if conversation_id:
        # 把对话编号加入请求数据。
        payload["conversation_id"] = conversation_id

    # 使用 try 捕获网络和接口错误，让网页收到可读的错误信息。
    try:
        # 向 Dify 发送请求，最多等待 300 秒。
        response = requests.post(dify_endpoint, headers=headers, json=payload, timeout=300)
        # 如果 HTTP 状态码表示失败，就抛出 HTTPError。
        response.raise_for_status()
        # 把 Dify 返回的数据转换为 Python 字典。
        result = response.json()
    # 如果请求超时，就返回 504 状态码和中文提示。
    except requests.exceptions.Timeout:
        # 告诉浏览器模型等待超时。
        return jsonify({"error": "等待模型回答超时，请稍后重试。"}), 504
    # 如果无法连接 Dify，就返回 503 状态码。
    except requests.exceptions.ConnectionError:
        # 提示用户检查 Docker Desktop、Dify 和 Ollama。
        return jsonify({"error": "无法连接 Dify，请确认 Docker Desktop、Dify 和 Ollama 正在运行。"}), 503
    # 如果 Dify 返回 HTTP 错误，就读取状态码和错误内容。
    except requests.exceptions.HTTPError as error:
        # 安全地获取状态码，缺少响应时显示“未知”。
        status_code = error.response.status_code if error.response is not None else 502
        # 安全地获取错误文字，缺少响应时显示通用信息。
        error_text = error.response.text if error.response is not None else "Dify 请求失败"
        # 把错误信息返回给网页，响应中不包含 API Key。
        return jsonify({"error": f"Dify 返回错误：HTTP {error.response.status_code if error.response is not None else '未知'}", "detail": error_text}), 502
    # 捕获其他请求异常。
    except requests.exceptions.RequestException as error:
        # 返回通用请求错误，避免服务器直接崩溃。
        return jsonify({"error": f"请求发生错误：{error}"}), 502

    # 从 Dify 返回数据中读取回答。
    answer = result.get("answer")

    # 如果回答不存在，就返回错误和原始数据方便排错。
    if answer is None:
        # 返回 502，说明上游没有提供有效回答。
        return jsonify({"error": "Dify 没有返回 answer 字段。", "detail": result}), 502

    # 返回回答和对话编号，浏览器会保存 conversation_id 以支持连续对话。
    return jsonify({
        # answer 是模型生成的回答。
        "answer": answer,
        # conversation_id 用于下一轮继续同一段对话。
        "conversation_id": result.get("conversation_id") or conversation_id,
    })

# 定义天气查询接口，浏览器只把城市名称发送到这里。
@app.post("/api/weather")
def weather():
    # 读取浏览器发来的 JSON 数据，并安全转换为字典。
    data = request.get_json(silent=True) or {}

    # 读取城市名称并去掉首尾空白。
    city = str(data.get("city", "")).strip()

    # 城市不能为空，否则直接返回 400。
    if not city:
        return jsonify({"error": "城市不能为空。"}), 400

    # 防止过长的输入占用不必要的资源。
    if len(city) > 50:
        return jsonify({"error": "城市名称不能超过 50 个字符。"}), 400

    # 天气工作流没有配置 Key 时，只影响天气接口，不影响聊天接口。
    if not dify_weather_key or "请在这里" in dify_weather_key:
        return jsonify({"error": "尚未配置天气工作流 API Key，请检查 .env。"}), 503

    # 准备发送给 Dify 的请求头，API Key 只在后端使用。
    headers = {
        "Authorization": f"Bearer {dify_weather_key}",
        "Content-Type": "application/json",
    }

    # 准备 Dify 工作流输入；city 对应工作流开始节点的变量名。
    payload = {
        "inputs": {"city": city},
        "response_mode": "blocking",
        "user": "local-weather-web",
    }

    # 捕获网络和 Dify 接口错误，给浏览器返回清楚的中文提示。
    try:
        # 天气查询通常很快，最多等待 60 秒。
        response = requests.post(dify_weather_endpoint, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        result = response.json()
    except requests.exceptions.Timeout:
        return jsonify({"error": "查询天气超时，请稍后重试。"}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "无法连接 Dify，请确认 Docker Desktop 和 Dify 正在运行。"}), 503
    except requests.exceptions.HTTPError as error:
        status_code = error.response.status_code if error.response is not None else 502
        return jsonify({"error": f"Dify 天气接口返回错误：HTTP {status_code}"}), 502
    except requests.exceptions.RequestException:
        return jsonify({"error": "调用 Dify 天气工作流失败。"}), 502

    # 从 Dify 工作流结果中取出 data 和 outputs。
    workflow_data = result.get("data") if isinstance(result, dict) else None
    if not isinstance(workflow_data, dict):
        return jsonify({"error": "Dify 返回的数据格式不正确。"}), 502

    # 工作流执行失败时，返回工作流提供的错误信息。
    workflow_status = workflow_data.get("status")
    if workflow_status and workflow_status != "succeeded":
        error_text = str(workflow_data.get("error") or "天气工作流执行失败。")
        return jsonify({"error": error_text}), 502

    outputs = workflow_data.get("outputs")
    if not isinstance(outputs, dict):
        return jsonify({"error": "Dify 没有返回 outputs 数据。"}), 502

    # weather_text 是天气卡片必须展示的中文结果。
    if not outputs.get("weather_text"):
        return jsonify({"error": "Dify 没有返回 weather_text 字段。"}), 502

    # 把结构化天气数据返回给浏览器，不返回任何 Dify 密钥。
    return jsonify({
        "city": city,
        "weather_text": outputs.get("weather_text"),
        "temperature": outputs.get("temperature"),
        "humidity": outputs.get("humidity"),
        "wind_speed": outputs.get("wind_speed"),
        "description": outputs.get("description"),
    })
# 只有直接运行这个文件时才启动网页服务器。
if __name__ == "__main__":
    # 只允许本机访问，端口使用 5000，调试模式关闭以避免重复启动。
    app.run(host=web_host, port=web_port, debug=False, use_reloader=False)
