# 导入 requests 工具包，它负责把问题送到 Ollama 的接口窗口。
import requests

# 保存本地 Ollama 提供的 OpenAI 兼容接口地址。
api_url = "http://127.0.0.1:11434/v1/chat/completions"

# 在终端显示提示文字，并等待用户输入问题；输入结果会保存到 question 中。
question = input("请输入你想问模型的问题：")

# 准备发给模型的数据，可以把它理解为一份点菜单。
payload = {
    # 指定使用响应较快的 qwen2.5:1.5b 模型。
    "model": "qwen2.5:1.5b",

    # messages 用来保存对话内容。
    "messages": [
        # content 使用刚才从键盘读取到的问题。
        {"role": "user", "content": question}
    ],

    # stream 设置为 False，表示一次性接收完整回答。
    "stream": False,
}

# 把问题和相关设置发送给 Ollama，最多等待 120 秒。
response = requests.post(api_url, json=payload, timeout=120)

# 如果接口返回错误，就让程序停止并显示错误原因。
response.raise_for_status()

# 把接口返回的数据转换成 Python 字典。
data = response.json()

# 从返回数据中取出模型生成的回答文字。
answer = data["choices"][0]["message"]["content"]

# 先打印一个空行和说明文字，让结果更容易阅读。
print("\n模型的回答：")

# 把模型生成的回答显示在屏幕上。
print(answer)
