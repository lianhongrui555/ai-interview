# 导入 os，用来设置环境变量。
import os

# 导入 Path，用来稳定地表示项目中的文件路径。
from pathlib import Path

# 取得当前脚本所在的项目目录。
project_dir = Path(__file__).resolve().parent

# 把 Ultralytics 的配置保存到项目目录，避免它写入系统用户目录时遇到权限问题。
os.environ["YOLO_CONFIG_DIR"] = str(project_dir / ".ultralytics")

# 导入 Ultralytics 的 YOLO 类，它是训练和推理的入口。
from ultralytics import YOLO


# 把训练代码放进主函数，Windows 多进程加载数据时更稳定。
def main():
    # 加载官方预训练的 YOLO11n 模型；第一次运行会自动下载权重文件。
    model = YOLO("yolo11n.pt")

    # 开始训练，并把训练参数集中写在这里。
    model.train(
        # 使用 Ultralytics 提供的 COCO128 小型数据集，适合第一次跑通。
        data="coco128.yaml",
        # 训练 10 轮，让模型多次查看数据并逐步调整参数。
        epochs=10,
        # 每张图片缩放到 640 像素，这是检测任务常用的尺寸。
        imgsz=640,
        # 一次送入显卡 16 张图片，12 GB 显存可以稳定支持。
        batch=16,
        # 使用编号为 0 的 NVIDIA 显卡进行训练。
        device=0,
        # 使用 2 个工作进程提前读取图片，减少显卡等待时间。
        workers=2,
        # 把训练结果统一保存在项目的 runs/train 目录中。
        project=str(project_dir / "runs" / "train"),
        # 给本次训练起一个容易辨认的名字。
        name="coco128_yolo11n",
        # 如果同名结果已存在，不自动覆盖，避免误删上次的训练结果。
        exist_ok=False,
        # 明确使用预训练权重，让小数据集训练更稳定。
        pretrained=True,
        # 固定随机种子，方便以后复现大致相同的实验。
        seed=42,
        # 尽量使用确定性算法，减少结果波动。
        deterministic=True,
    )

    # 输出一句中文提示，告诉使用者训练流程已经结束。
    print("训练完成，结果保存在 runs/train/coco128_yolo11n 目录。")


# 只有直接运行这个文件时才执行训练；被其他程序导入时不会自动训练。
if __name__ == "__main__":
    # 调用上面的主函数。
    main()
