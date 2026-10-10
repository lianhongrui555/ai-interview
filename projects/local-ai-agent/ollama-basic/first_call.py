# 导入 requests 工具包，它像一名“快递员”，负责把我们的请求送到 API。
import requests

# 这里填写本地 Ollama 提供的 OpenAI 兼容接口地址。
api_url = "http://127.0.0.1:11434/v1/chat/completions"

# 这里准备要发给模型的内容，可以把它理解为一份“点菜单”。
payload = {
    # 指定使用已经安装的轻量模型，1.5b 响应更快，适合第一次测试。
    "model": "qwen2.5:1.5b",

    # messages 用来放对话内容，role 是“user”表示这句话来自用户。
    "messages": [
        # content 是我们要对模型说的一句话。
        {"role": "user", "content": "你好，请用一句话介绍你自己。"}
    ],

    # stream 设置为 False，表示等模型全部回答完后，再一次性拿回结果。
    "stream": False,
}

# 使用 POST 方式把内容发送给 Ollama，timeout=120 表示最多等待 120 秒。
response = requests.post(api_url, json=payload, timeout=120)

# 如果服务器返回错误，就让程序停下来并报告错误，避免继续使用错误结果。
response.raise_for_status()

# 把服务器返回的 JSON 数据转换成 Python 字典，方便取出里面的回答。
data = response.json()

# 从返回数据中取出模型真正回答的那段文字。
answer = data["choices"][0]["message"]["content"]

# 把模型的回答打印到屏幕上，让我们能看到最终结果。
print(answer)
