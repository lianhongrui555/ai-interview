
"""与本地 Ollama 服务通信的客户端。"""

import requests

from config import OLLAMA_HOST, DEFAULT_MODEL


def chat(prompt, model=DEFAULT_MODEL):
    """向模型提问，返回模型的回答。"""
    url = f"{OLLAMA_HOST}/api/generate"

    data = {
        "model": model,
        "prompt": prompt,
        "stream": False,
    }

    response = requests.post(url, json=data, timeout=300)
    result = response.json()

    return result["response"]


if __name__ == "__main__":
    answer = chat("用一句话介绍你自己，你能在我学习ai帮助我什么" \
    "")
    print(answer)