# 导入 json，用来保存测试结果。
import json

# 导入 statistics，用来计算平均值和中位数。
import statistics

# 导入 time，用来记录 HTTP 请求耗时。
import time

# 导入 Path，用来查找测试图片。
from pathlib import Path

# 导入 requests，用来访问两个本地网页服务。
import requests

# 指定 V1 和 V2 服务地址。
servers = {
    "V1-5000": "http://127.0.0.1:5000",
    "V2-5001": "http://127.0.0.1:5001",
}

# 指定测试图片目录。
image_dir = Path(r"C:\Users\23696\Documents\ChatGPT\datasets\coco128\images\train2017")

# 固定使用前 8 张图片。
image_paths = sorted(image_dir.glob("*.jpg"))[:8]


# 定义一个函数，向一个服务发送一张图片。
def send_image(server_url, image_path):
    # 打开图片文件。
    with image_path.open("rb") as image_file:
        # 记录 HTTP 请求开始时间。
        start_time = time.perf_counter()

        # 发送图片并等待 JSON 结果。
        response = requests.post(
            f"{server_url}/predict",
            files={"image": (image_path.name, image_file, "image/jpeg")},
            timeout=60,
        )

        # 计算客户端看到的完整耗时。
        client_ms = (time.perf_counter() - start_time) * 1000

    # 如果服务返回错误，就停止并显示状态码。
    response.raise_for_status()

    # 取得服务端返回的数据。
    result = response.json()

    # 返回客户端耗时和服务端自身记录的推理耗时。
    return client_ms, float(result["inference_ms"])


# 保存两个服务的最终结果。
all_results = {}

# 逐个测试服务。
for server_name, server_url in servers.items():
    # 输出当前服务名称。
    print(f"[{server_name}] 健康检查...", flush=True)

    # 检查服务是否正常。
    health = requests.get(f"{server_url}/health", timeout=10).json()

    # 输出健康状态。
    print(f"[{server_name}] {health}", flush=True)

    # 使用第一张图片热身两次，排除首次初始化影响。
    for _ in range(2):
        send_image(server_url, image_paths[0])

    # 保存客户端完整耗时。
    client_times = []

    # 保存服务端推理耗时。
    inference_times = []

    # 重复测试 3 轮。
    for round_index in range(3):
        # 按固定顺序发送所有测试图片。
        for image_path in image_paths:
            # 发送图片并取得耗时。
            client_ms, inference_ms = send_image(server_url, image_path)

            # 保存两种耗时。
            client_times.append(client_ms)
            inference_times.append(inference_ms)

        # 输出本轮的客户端平均耗时。
        print(f"[{server_name}] 第 {round_index + 1} 轮完成", flush=True)

    # 计算并保存结果。
    all_results[server_name] = {
        "客户端平均毫秒": round(statistics.mean(client_times), 2),
        "客户端中位数毫秒": round(statistics.median(client_times), 2),
        "客户端最快毫秒": round(min(client_times), 2),
        "客户端最慢毫秒": round(max(client_times), 2),
        "客户端每秒帧数": round(1000 / statistics.mean(client_times), 2),
        "服务端推理平均毫秒": round(statistics.mean(inference_times), 2),
        "服务端推理中位数毫秒": round(statistics.median(inference_times), 2),
        "测试次数": len(client_times),
    }


# 指定结果保存路径。
result_path = Path(__file__).resolve().parent / "benchmark_web.json"

# 保存中文可读 JSON。
result_path.write_text(json.dumps(all_results, ensure_ascii=False, indent=2), encoding="utf-8")

# 输出最终对比。
print("\n网页端到端结果：", flush=True)

# 逐个服务显示结果。
for server_name, result in all_results.items():
    print(
        f"{server_name}: 客户端中位数 {result['客户端中位数毫秒']} ms，"
        f"服务端推理中位数 {result['服务端推理中位数毫秒']} ms，"
        f"平均 {result['客户端每秒帧数']} FPS",
        flush=True,
    )

# 输出结果文件路径。
print(f"结果已保存：{result_path}", flush=True)
