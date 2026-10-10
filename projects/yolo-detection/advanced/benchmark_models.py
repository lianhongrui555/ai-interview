# 导入 gc 和 os，用来释放模型以及设置配置目录。
import gc
import os

# 导入 json，用来保存测试结果。
import json

# 导入 statistics，用来求平均值和中位数。
import statistics

# 导入 time，用来测量耗时。
import time

# 导入 Path，用来定位模型和图片。
from pathlib import Path

# 导入 OpenCV，用来提前把图片读取到内存。
import cv2

# 导入 PyTorch，用来同步 GPU。
import torch

# 取得当前脚本所在目录。
project_dir = Path(__file__).resolve().parent

# 把 Ultralytics 配置保存在 V2 目录。
os.environ["YOLO_CONFIG_DIR"] = str(project_dir / ".ultralytics")

# 导入 Ultralytics 的 YOLO 类。
from ultralytics import YOLO


# 指定 V1 和 V2 模型。
model_paths = {
    "V1-YOLO11n": Path(r"C:\Users\23696\Documents\ChatGPT\test\yolo-project\runs\train\coco128_yolo11n\weights\best.pt"),
    "V2-YOLO11s": project_dir / "runs" / "train" / "coco128_yolo11s_v2" / "weights" / "best.pt",
}

# 指定 COCO128 图片目录。
image_dir = Path(r"C:\Users\23696\Documents\ChatGPT\datasets\coco128\images\train2017")

# 读取前 8 张图片到内存，保证速度测试不受硬盘读取速度影响。
image_paths = sorted(image_dir.glob("*.jpg"))[:8]

# 使用 OpenCV 读取图片数组。
frames = []

# 逐张读取图片。
for image_path in image_paths:
    # 读取图片。
    frame = cv2.imread(str(image_path))

    # 如果图片读取失败，就报告具体路径。
    if frame is None:
        raise RuntimeError(f"无法读取图片：{image_path}")

    # 保存已经读取的图片。
    frames.append(frame)

# 定义一个统一的推理参数。
predict_args = {
    "conf": 0.35,
    "imgsz": 640,
    "device": 0,
    "verbose": False,
}


# 定义一个函数，测试单个模型的批量和逐帧性能。
def benchmark_model(model_name, model_path):
    # 为当前模型清理缓存。
    gc.collect()
    torch.cuda.empty_cache()

    # 输出当前正在加载哪个模型。
    print(f"[{model_name}] 正在加载模型...", flush=True)

    # 加载模型。
    model = YOLO(str(model_path))

    # 使用第一张图片热身两次。
    for _ in range(2):
        model.predict(source=frames[0], **predict_args)

    # 等待显卡完成热身。
    torch.cuda.synchronize()

    # 输出开始批量测试。
    print(f"[{model_name}] 正在测试批量吞吐...", flush=True)

    # 保存批量测试的每张图平均耗时。
    batch_times = []

    # 连续测试 3 个批次。
    for _ in range(3):
        # 同步显卡，保证计时边界准确。
        torch.cuda.synchronize()

        # 记录开始时间。
        start_time = time.perf_counter()

        # 一次把 8 张图片送入模型。
        model.predict(source=frames, batch=len(frames), **predict_args)

        # 等待这一批全部完成。
        torch.cuda.synchronize()

        # 计算这一批平均到每张图的时间。
        elapsed_ms = (time.perf_counter() - start_time) * 1000 / len(frames)

        # 保存结果。
        batch_times.append(elapsed_ms)

        # 立即输出本批次结果。
        print(f"[{model_name}] 批量每帧：{elapsed_ms:.2f} ms", flush=True)

    # 输出开始逐帧延迟测试。
    print(f"[{model_name}] 正在测试单帧延迟...", flush=True)

    # 保存逐帧测试耗时。
    single_times = []

    # 对每张内存图片执行一次单帧推理。
    for index, frame in enumerate(frames):
        # 同步显卡。
        torch.cuda.synchronize()

        # 记录开始时间。
        start_time = time.perf_counter()

        # 只送入一张图片。
        model.predict(source=frame, **predict_args)

        # 等待显卡完成。
        torch.cuda.synchronize()

        # 计算本次耗时。
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        # 保存结果。
        single_times.append(elapsed_ms)

        # 立即输出单帧结果。
        print(f"[{model_name}] 单帧 {index + 1}/8：{elapsed_ms:.2f} ms", flush=True)

    # 整理测试结果。
    result = {
        "批量平均毫秒": round(statistics.mean(batch_times), 2),
        "单帧平均毫秒": round(statistics.mean(single_times), 2),
        "单帧中位数毫秒": round(statistics.median(single_times), 2),
        "单帧最快毫秒": round(min(single_times), 2),
        "单帧最慢毫秒": round(max(single_times), 2),
        "单帧每秒帧数": round(1000 / statistics.mean(single_times), 2),
    }

    # 删除模型，释放显存。
    del model
    gc.collect()
    torch.cuda.empty_cache()

    # 返回测试结果。
    return result


# 保存所有结果。
results = {}

# 依次测试 V1 和 V2。
for model_name, model_path in model_paths.items():
    # 确认模型文件存在。
    if not model_path.exists():
        raise FileNotFoundError(f"找不到模型：{model_path}")

    # 执行测试。
    results[model_name] = benchmark_model(model_name, model_path)


# 保存 JSON 结果文件。
result_path = project_dir / "benchmark_base.json"

# 以中文可读格式写入文件。
result_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

# 输出最终汇总。
print("\n最终结果：", flush=True)

# 逐个模型显示结果。
for model_name, result in results.items():
    print(
        f"{model_name}: 批量 {result['批量平均毫秒']} ms/帧，"
        f"单帧平均 {result['单帧平均毫秒']} ms，"
        f"{result['单帧每秒帧数']} FPS",
        flush=True,
    )

# 输出结果文件位置。
print(f"结果已保存：{result_path}", flush=True)
