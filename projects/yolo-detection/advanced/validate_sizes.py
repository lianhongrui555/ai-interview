# 导入 os，用来设置软件配置目录。
import os

# 导入 json，用来保存准确率结果。
import json

# 导入 Path，用来定位模型和输出目录。
from pathlib import Path

# 取得当前脚本所在目录。
project_dir = Path(__file__).resolve().parent

# 把 Ultralytics 配置保存在 V2 目录。
os.environ["YOLO_CONFIG_DIR"] = str(project_dir / ".ultralytics")

# 把 Matplotlib 配置也保存在 V2 目录，避免系统目录权限问题。
os.environ["MPLCONFIGDIR"] = str(project_dir / ".matplotlib")

# 创建 Matplotlib 配置目录。
(project_dir / ".matplotlib").mkdir(parents=True, exist_ok=True)

# 导入 Ultralytics 的 YOLO 类。
from ultralytics import YOLO


# 把验证逻辑放进主函数，避免 Windows 多进程重复执行脚本。
def main():
    # 指定 V2 最佳模型。
    model_path = project_dir / "runs" / "train" / "coco128_yolo11s_v2" / "weights" / "best.pt"

    # 加载模型。
    model = YOLO(str(model_path))

    # 定义要比较的输入尺寸。
    image_sizes = [640, 512, 480]

    # 保存每种尺寸的验证结果。
    results = {}

    # 逐个尺寸执行验证。
    for image_size in image_sizes:
        # 输出当前正在验证的尺寸。
        print(f"正在验证 imgsz={image_size}...", flush=True)

        # 使用 COCO128 验证集测试准确率。
        validation_result = model.val(
            data="coco128.yaml",
            imgsz=image_size,
            batch=8,
            device=0,
            workers=0,
            plots=False,
            verbose=False,
            project=str(project_dir / "runs" / "val"),
            name=f"coco128_v2_imgsz{image_size}",
            exist_ok=True,
        )

        # 保存本尺寸的关键指标。
        results[str(image_size)] = {
            "Precision": round(float(validation_result.results_dict["metrics/precision(B)"]), 4),
            "Recall": round(float(validation_result.results_dict["metrics/recall(B)"]), 4),
            "mAP50": round(float(validation_result.results_dict["metrics/mAP50(B)"]), 4),
            "mAP50-95": round(float(validation_result.results_dict["metrics/mAP50-95(B)"]), 4),
        }

        # 立即输出本尺寸结果。
        print(f"imgsz={image_size} 完成：{results[str(image_size)]}", flush=True)

    # 保存结果文件。
    result_path = project_dir / "validation_sizes.json"

    # 写入中文可读 JSON。
    result_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    # 输出文件位置。
    print(f"验证结果已保存：{result_path}", flush=True)


# 只有直接运行这个脚本时才执行验证。
if __name__ == "__main__":
    # 调用主函数。
    main()
