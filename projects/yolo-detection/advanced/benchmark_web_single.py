# 导入 argparse，用来读取服务名称和地址。
import argparse

# 导入 json，用来保存结果。
import json

# 导入 statistics，用来计算平均值和中位数。
import statistics

# 导入 time，用来测量 HTTP 耗时。
import time

# 导入 Path，用来查找图片和保存结果。
from pathlib import Path

# 导入 requests，用来发送图片。
import requests


# 读取命令行参数。
parser = argparse.ArgumentParser(description="测试单个 YOLO 网页服务")

# 添加服务名称参数。
parser.add_argument("--name", required=True, help="例如 V1-5000")

# 添加服务地址参数。
parser.add_argument("--url", required=True, help="例如 http://127.0.0.1:5000")

# 读取参数。
args = parser.parse_args()

# 指定测试图片目录。
image_dir = Path(r"C:\Users\23696\Documents\ChatGPT\datasets\coco128\images\train2017")

# 固定选择前 8 张图片。
image_paths = sorted(image_dir.glob("*.jpg"))[:8]


# 定义一个函数，发送一张图片。
def send_image(image_path):
    # 打开图片文件。
    with image_path.open("rb") as image_file:
        # 记录客户端开始时间。
        start_time = time.perf_counter()

        # 向当前服务发送图片。
        response = requests.post(
            f"{args.url}/predict",
            files={"image": (image_path.name, image_file, "image/jpeg")},
            timeout=60,
        )

        # 计算客户端完整耗时。
        client_ms = (time.perf_counter() - start_time) * 1000

    # 如果返回错误，就立即报告。
    response.raise_for_status()

    # 读取服务端结果。
    result = response.json()

    # 返回两种耗时。
    return client_ms, float(result["inference_ms"])


# 检查当前服务是否正常。
print(f"[{args.name}] 健康检查...", flush=True)

# 读取健康信息。
health = requests.get(f"{args.url}/health", timeout=10).json()

# 输出健康信息。
print(f"[{args.name}] {health}", flush=True)

# 用第一张图热身两次。
for _ in range(2):
    send_image(image_paths[0])

# 保存客户端总耗时。
client_times = []

# 保存服务端推理耗时。
inference_times = []

# 重复测试 3 轮。
for round_index in range(3):
    # 逐张发送图片。
    for image_path in image_paths:
        # 发送并取得耗时。
        client_ms, inference_ms = send_image(image_path)

        # 保存结果。
        client_times.append(client_ms)
        inference_times.append(inference_ms)

    # 输出当前轮次完成。
    print(f"[{args.name}] 第 {round_index + 1} 轮完成", flush=True)

# 整理本服务的测试结果。
result = {
    args.name: {
        "客户端平均毫秒": round(statistics.mean(client_times), 2),
        "客户端中位数毫秒": round(statistics.median(client_times), 2),
        "客户端最快毫秒": round(min(client_times), 2),
        "客户端最慢毫秒": round(max(client_times), 2),
        "客户端每秒帧数": round(1000 / statistics.mean(client_times), 2),
        "服务端推理平均毫秒": round(statistics.mean(inference_times), 2),
        "服务端推理中位数毫秒": round(statistics.median(inference_times), 2),
        "测试次数": len(client_times),
    }
}

# 保存单独结果文件。
result_path = Path(__file__).resolve().parent / f"benchmark_web_{args.name}.json"

# 写入 UTF-8 JSON。
result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

# 输出本服务汇总。
print(
    f"[{args.name}] 客户端中位数 {result[args.name]['客户端中位数毫秒']} ms，"
    f"服务端推理中位数 {result[args.name]['服务端推理中位数毫秒']} ms，"
    f"平均 {result[args.name]['客户端每秒帧数']} FPS",
    flush=True,
)

# 输出结果文件位置。
print(f"结果已保存：{result_path}", flush=True)
