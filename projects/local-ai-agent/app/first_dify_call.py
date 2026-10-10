# 导入 os 工具，用于从环境变量中读取 API 地址和密钥。
import os

# 导入 Path 工具，用于准确找到与本文件位于同一目录的 .env 文件。
from pathlib import Path

# 导入 requests 工具包，它负责向 Dify 的 API 发送请求。
import requests

# 导入 load_dotenv 工具，用于读取 .env 文件中的保密配置。
from dotenv import load_dotenv

# 计算 .env 的完整路径，确保无论从哪里运行程序都能找到它。
env_path = Path(__file__).with_name(".env")

# 读取 .env 文件，把其中的配置加载到环境变量中。
load_dotenv(dotenv_path=env_path)

# 从环境变量中读取 Dify API 的基础地址。
api_url = os.getenv("DIFY_API_URL")

# 从环境变量中读取 Dify API Key，密钥只保存在本地 .env 文件中。
api_key = os.getenv("DIFY_API_KEY")

# 检查 API 地址是否缺失。
if not api_url:
    # 如果地址缺失，就停止程序并显示清楚的中文提示。
    raise SystemExit("错误：.env 中缺少 DIFY_API_URL。")

# 检查 API Key 是否缺失或仍然是占位文字。
if not api_key or "请在这里" in api_key:
    # 如果密钥没有填写，就停止程序并提示用户修改 .env。
    raise SystemExit("错误：请在 .env 中填写真实的 DIFY_API_KEY。")

# 拼接完整的聊天接口地址，并去掉基础地址可能多余的最后一条斜杠。
endpoint = api_url.rstrip("/") + "/chat-messages"

# 准备请求头，Authorization 用来证明我们有权调用这个智能体。
headers = {
    # Bearer 后面的内容就是从 .env 读取到的 API Key。
    "Authorization": f"Bearer {api_key}",
    # 告诉 Dify 我们发送的数据是 JSON 格式。
    "Content-Type": "application/json",
}

# 准备要发送给 Dify 的数据，可以把它理解为一份点菜单。
payload = {
    # inputs 用来传递工作流开始节点中定义的输入变量，这里暂时没有。
    "inputs": {},
    # query 是我们要问智能体的问题。
    "query": "你好，请用一句话介绍你自己。",
    # blocking 表示等模型完整回答后，一次性返回结果。
    "response_mode": "blocking",
    # user 是调用方的标识，本机测试时使用固定名称即可。
    "user": "local-python-user",
}

# 使用 POST 把问题发送给 Dify，最多等待 300 秒。
response = requests.post(endpoint, headers=headers, json=payload, timeout=300)

# 如果 HTTP 状态码表示失败，就抛出错误，避免继续读取错误结果。
response.raise_for_status()

# 把 Dify 返回的 JSON 数据转换成 Python 字典。
data = response.json()

# 从返回数据中取出智能体生成的回答。
answer = data.get("answer")

# 如果返回内容中没有 answer 字段，就显示返回数据方便排错。
if answer is None:
    # 停止程序并显示 Dify 实际返回的数据。
    raise SystemExit(f"没有找到 answer 字段，Dify 返回：{data}")

# 把智能体的回答打印到终端。
print(answer)
