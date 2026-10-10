# 导入 os，用来设置 Ultralytics 配置目录。
import os

# 导入 json，用来保存测试结果。
import json

# 导入 statistics，用来计算平均值和中位数。
import statistics

# 导入 time，用来测量推理耗时。
import time

# 导入 Path，用来定位模型和图片。
from pathlib import Path

# 导入 OpenCV，用来把图片提前读取到内存。
import cv2

# 导入 PyTorch，用来同步 GPU。
import torch

# 取得当前脚本所在目录。
project_dir = Path(__file__).resolve().parent

# 把 Ultralytics 配置保存在 V2 目录。
os.environ["YOLO_CONFIG_DIR"] = str(project_dir / ".ultralytics")

# 导入 Ultralytics 的 YOLO 类。
from ultralytics import YOLO


# 指定 V2 最佳模型。
model_path = project_dir / "runs" / "train" / "coco128_yolo11s_v2" / "weights" / "best.pt"

# 指定测试图片目录。
image_dir = Path(r"C:\Users\23696\Documents\ChatGPT\datasets\coco128\images\train2017")

# 选择固定 8 张图片，保证每种配置使用相同数据。
image_paths = sorted(image_dir.glob("*.jpg"))[:8]

# 读取图片到内存，排除硬盘读取速度的影响。
frames = [cv2.imread(str(path)) for path in image_paths]

# 如果存在读取失败的图片，就立即报告。
if any(frame is None for frame in frames):
    raise RuntimeError("有图片读取失败，请检查测试图片目录。")

# 定义三种待比较配置。
configurations = {
    "FP32-640": {"quantize": None, "imgsz": 640},
    "FP32-512": {"quantize": None, "imgsz": 512},
    "FP32-480": {"quantize": None, "imgsz": 480},
}


# 定义一个函数，测试一种配置。
def benchmark_configuration(model, configuration_name, options):
    # 输出当前配置名称。
    print(f"[{configuration_name}] 开始测试...", flush=True)

    # 组合基础推理参数和当前配置参数。
    predict_args = {
        "conf": 0.35,
        "device": 0,
        "verbose": False,
        **options,
    }

    # 用第一张图热身两次，让当前配置完成初始化。
    for _ in range(2):
        model.predict(source=frames[0], **predict_args)

    # 等待显卡完成热身。
    torch.cuda.synchronize()

    # 保存批量测试结果。
    batch_times = []

    # 连续测试 3 个批次。
    for _ in range(3):
        # 同步显卡，保证计时准确。
        torch.cuda.synchronize()

        # 记录开始时间。
        start_time = time.perf_counter()

        # 一次处理 8 张图片。
        model.predict(source=frames, batch=len(frames), **predict_args)

        # 等待批处理全部完成。
        torch.cuda.synchronize()

        # 把批次耗时换算成每张图片的平均耗时。
        elapsed_ms = (time.perf_counter() - start_time) * 1000 / len(frames)

        # 保存结果。
        batch_times.append(elapsed_ms)

        # 立即显示结果。
        print(f"[{configuration_name}] 批量每帧：{elapsed_ms:.2f} ms", flush=True)

    # 保存逐帧测试结果。
    single_times = []

    # 逐张进行单帧推理。
    for index, frame in enumerate(frames):
        # 同步显卡。
        torch.cuda.synchronize()

        # 记录单帧开始时间。
        start_time = time.perf_counter()

        # 执行单帧推理。
        model.predict(source=frame, **predict_args)

        # 等待显卡完成计算。
        torch.cuda.synchronize()

        # 计算并保存单帧耗时。
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        # 保存结果。
        single_times.append(elapsed_ms)

        # 立即输出单帧结果。
        print(f"[{configuration_name}] 单帧 {index + 1}/8：{elapsed_ms:.2f} ms", flush=True)

    # 返回汇总指标。
    return {
        "批量平均毫秒": round(statistics.mean(batch_times), 2),
        "单帧平均毫秒": round(statistics.mean(single_times), 2),
        "单帧中位数毫秒": round(statistics.median(single_times), 2),
        "单帧最快毫秒": round(min(single_times), 2),
        "单帧最慢毫秒": round(max(single_times), 2),
        "单帧每秒帧数": round(1000 / statistics.mean(single_times), 2),
    }


# 加载 V2 模型。
model = YOLO(str(model_path))

# 保存所有配置的结果。
results = {}

# 逐个运行测试配置。
for configuration_name, options in configurations.items():
    try:
        # 测试当前配置。
        results[configuration_name] = benchmark_configuration(model, configuration_name, options)
    except Exception as error:
        # 如果某个配置不支持，也保留错误信息继续测试下一个。
        results[configuration_name] = {"错误": str(error)}
        print(f"[{configuration_name}] 测试失败：{error}", flush=True)


# 保存测试结果文件。
result_path = project_dir / "benchmark_optimized.json"

# 写入 JSON 文件。
result_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

# 输出最终汇总。
print("\n优化测试结果：", flush=True)

# 逐个配置显示结果。
for configuration_name, result in results.items():
    if "错误" in result:
        print(f"{configuration_name}: 失败 - {result['错误']}", flush=True)
    else:
        print(
            f"{configuration_name}: 单帧平均 {result['单帧平均毫秒']} ms，"
            f"{result['单帧每秒帧数']} FPS",
            flush=True,
        )

# 输出结果文件位置。
print(f"结果已保存：{result_path}", flush=True)

