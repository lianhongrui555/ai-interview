# 导入 os，用来设置 Ultralytics 的配置目录。
import os

# 导入 Path，用来定位 V2 项目目录。
from pathlib import Path

# 取得当前 V2 脚本所在目录。
project_dir = Path(__file__).resolve().parent

# 把 Ultralytics 配置保存到 V2 目录，避免写入系统目录时遇到权限问题。
os.environ["YOLO_CONFIG_DIR"] = str(project_dir / ".ultralytics")

# 导入 Ultralytics 的 YOLO 类。
from ultralytics import YOLO


# 把训练逻辑放进主函数，Windows 多进程读取数据时更稳定。
def main():
    # 加载 YOLO11s 预训练模型；s 比 V1 使用的 n 更大，通常检测能力更强。
    model = YOLO("yolo11s.pt")

    # 开始 V2 训练。
    model.train(
        # 继续使用 COCO128 数据集，保证 V1 和 V2 的公平比较。
        data="coco128.yaml",
        # 训练轮数从 10 提高到 50，让模型有更多调整机会。
        epochs=50,
        # 继续使用 640 像素输入尺寸，避免通过降低尺寸虚假提高速度。
        imgsz=640,
        # YOLO11s 更大，批大小从 16 降到 8，降低显存压力。
        batch=8,
        # 使用编号为 0 的 NVIDIA 显卡。
        device=0,
        # 使用两个工作进程读取图片。
        workers=2,
        # 开启自动混合精度，减少显存占用并提升显卡利用效率。
        amp=True,
        # 使用余弦学习率，让训练后期的参数变化更平滑。
        cos_lr=True,
        # 最后 10 轮关闭 Mosaic 数据增强，让模型更专注于真实图像。
        close_mosaic=10,
        # 如果 15 轮没有提升，就提前结束，避免无效等待和过拟合。
        patience=15,
        # 把结果保存到 V2 的 runs/train 目录。
        project=str(project_dir / "runs" / "train"),
        # 给本次训练一个清楚的名字。
        name="coco128_yolo11s_v2",
        # 不允许覆盖同名结果，保护以前的训练记录。
        exist_ok=False,
        # 使用预训练权重，让较小数据集上的训练更稳定。
        pretrained=True,
        # 固定随机种子，便于比较和复现。
        seed=42,
        # 尽量使用确定性算法，减少随机波动。
        deterministic=True,
    )

    # 训练结束后输出中文提示。
    print("V2 训练完成，结果保存在 advanced/runs/train/coco128_yolo11s_v2。")


# 只有直接运行脚本时才开始训练。
if __name__ == "__main__":
    # 调用主函数。
    main()
