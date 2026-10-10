# 导入 os 工具，用于读取 .env 中的 API 地址和密钥。
import os

# 导入 Path 工具，用于定位与当前程序位于同一目录的 .env 文件。
from pathlib import Path

# 导入 requests 工具包，用它向 Dify API 发送和接收数据。
import requests

# 导入 load_dotenv 工具，用于安全读取 .env 文件。
from dotenv import load_dotenv

# 计算 .env 文件的完整路径。
env_path = Path(__file__).with_name(".env")

# 读取 .env 中的配置，并把它们加载到程序环境中。
load_dotenv(dotenv_path=env_path)

# 读取 Dify API 的基础地址。
api_url = os.getenv("DIFY_API_URL")

# 读取 Dify API Key。
api_key = os.getenv("DIFY_API_KEY")

# 检查 API 地址是否存在。
if not api_url:
    # 如果地址缺失，就停止程序并提示用户检查 .env。
    raise SystemExit("错误：.env 中缺少 DIFY_API_URL。")

# 检查 API Key 是否缺失或仍是占位文字。
if not api_key or "请在这里" in api_key:
    # 如果密钥不存在，就停止程序并提示用户填写。
    raise SystemExit("错误：请在 .env 中填写真实的 DIFY_API_KEY。")

# 拼接 Dify 的聊天接口完整地址。
endpoint = api_url.rstrip("/") + "/chat-messages"

# 准备请求头，其中 Authorization 用于验证 API Key。
headers = {
    # Bearer 后面使用从 .env 读取的 API Key。
    "Authorization": f"Bearer {api_key}",
    # 告诉 Dify 请求内容使用 JSON 格式。
    "Content-Type": "application/json",
}

# 创建一个空字符串，用来保存 Dify 返回的对话编号。
conversation_id = ""

# 创建一个固定用户标识，让 Dify 知道这些消息属于同一个使用者。
user_id = "local-cli-user"

# 显示欢迎文字和可用命令。
print("Dify 本地 CLI 聊天已启动")
print("输入 /new 开始新对话，输入 /help 查看帮助，输入 /exit 退出程序。")

# 使用 while True 创建循环，让程序可以持续接收问题。
while True:
    # 暂停程序并等待用户输入问题。
    question = input("\n你：").strip()

    # 如果输入为空，就重新显示输入提示，不发送空消息。
    if not question:
        continue

    # 把输入转换成小写，便于判断退出命令；中文内容不会受影响。
    command = question.lower()

    # 如果用户输入退出命令，就结束循环。
    if command in ("/exit", "exit", "退出"):
        # 显示告别文字。
        print("聊天结束，下次再见。")
        # 使用 break 跳出循环，程序随后正常结束。
        break

    # 如果用户要求开始新对话，就清空对话编号。
    if command in ("/new", "new", "新对话"):
        # 清空 conversation_id 后，下一条消息会被 Dify 当作新对话。
        conversation_id = ""
        # 告诉用户新对话已经开始。
        print("已经开始新对话，之前的上下文不再带入。")
        # 跳过本轮后续代码，重新等待用户输入。
        continue

    # 如果用户输入帮助命令，就显示命令说明。
    if command in ("/help", "help", "帮助"):
        # 打印三条可用命令。
        print("/new：开始新对话")
        print("/help：查看命令帮助")
        print("/exit：退出程序")
        # 跳过本轮后续代码，回到输入提示。
        continue

    # 准备要发送给 Dify 的数据。
    payload = {
        # inputs 用于工作流开始节点中的输入变量，当前没有额外变量。
        "inputs": {},
        # query 保存用户刚才输入的问题。
        "query": question,
        # blocking 表示等待模型完整回答后再返回。
        "response_mode": "blocking",
        # user 使用固定标识，保证同一用户上下文可以延续。
        "user": user_id,
    }

    # 如果已经存在 conversation_id，就把它加入请求。
    if conversation_id:
        # 传入 conversation_id 可以让 Dify 记住之前的聊天内容。
        payload["conversation_id"] = conversation_id

    # 使用 try 捕获网络错误，避免程序直接崩溃。
    try:
        # 使用 POST 把问题发送给 Dify，最多等待 300 秒。
        response = requests.post(endpoint, headers=headers, json=payload, timeout=300)
        # 如果状态码表示失败，就抛出 HTTPError。
        response.raise_for_status()
        # 把返回的 JSON 数据转换为 Python 字典。
        data = response.json()
        # 取出模型生成的回答。
        answer = data.get("answer")
        # 取出 Dify 返回的对话编号，供下一轮继续使用。
        conversation_id = data.get("conversation_id") or conversation_id
    # 如果等待超时，就显示清楚的提示。
    except requests.exceptions.Timeout:
        print("错误：等待模型回答超时，请稍后重试。")
        # 跳过本轮剩余代码，继续等待下一条问题。
        continue
    # 如果无法连接 Dify，就提示检查 Docker Desktop 和 Dify。
    except requests.exceptions.ConnectionError:
        print("错误：无法连接 Dify，请确认 Docker Desktop 和 Dify 正在运行。")
        # 跳过本轮剩余代码，继续等待下一条问题。
        continue
    # 如果 Dify 返回 HTTP 错误，就显示状态码和返回内容。
    except requests.exceptions.HTTPError as error:
        # 安全地获取状态码和响应文字，不包含 API Key。
        status_code = error.response.status_code if error.response is not None else "未知"
        response_text = error.response.text if error.response is not None else "无返回内容"
        print(f"Dify 返回错误：HTTP {status_code}")
        print(f"错误详情：{response_text}")
        # 跳过本轮剩余代码，继续等待下一条问题。
        continue
    # 捕获其他请求错误，防止程序意外退出。
    except requests.exceptions.RequestException as error:
        print(f"请求发生错误：{error}")
        # 跳过本轮剩余代码，继续等待下一条问题。
        continue

    # 检查返回数据中是否存在 answer 字段。
    if answer is None:
        # 如果没有回答字段，就显示 Dify 返回的完整数据，便于排错。
        print(f"没有收到回答字段，Dify 返回：{data}")
        # 跳过本轮剩余代码，继续等待下一条问题。
        continue

    # 在终端显示 Dify 的回答。
    print(f"AI：{answer}")
