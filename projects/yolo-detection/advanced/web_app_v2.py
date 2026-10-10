# 导入 os，用来设置 Ultralytics 的配置目录。
import os

# 导入 time，用来统计推理耗时。
import time

# 导入 Path，用来稳定地定位项目文件。
from pathlib import Path

# 导入 NumPy，用来把浏览器传来的图片字节转换成图像数组。
import numpy as np

# 导入 OpenCV，用来解码图片并绘制检测框。
import cv2

# 导入 PyTorch，用来检查电脑的 CUDA 是否可用。
import torch

# 导入 Flask 常用的网页服务工具。
from flask import Flask, jsonify, render_template, request

# 取得当前脚本所在的项目目录。
project_dir = Path(__file__).resolve().parent

# 把 Ultralytics 配置保存在项目目录中，避免系统目录权限问题。
os.environ["YOLO_CONFIG_DIR"] = str(project_dir / ".ultralytics")

# 导入 Ultralytics 的 YOLO 类。
from ultralytics import YOLO


# 指定训练得到的最佳模型路径。
model_path = project_dir / "runs" / "train" / "coco128_yolo11s_v2" / "weights" / "best.pt"

# 启动网页服务时只加载一次模型，避免每次请求都重复加载。
model = YOLO(str(model_path))

# 创建 Flask 应用。
app = Flask(__name__)


# 定义一个英文类别到中文名称的常用对照表，方便页面阅读。
class_name_cn = {
    "person": "人",
    "bicycle": "自行车",
    "car": "汽车",
    "motorcycle": "摩托车",
    "airplane": "飞机",
    "bus": "公交车",
    "train": "火车",
    "truck": "卡车",
    "boat": "船",
    "cat": "猫",
    "dog": "狗",
    "horse": "马",
    "sheep": "羊",
    "cow": "牛",
    "bottle": "瓶子",
    "cup": "杯子",
    "chair": "椅子",
    "couch": "沙发",
    "potted plant": "盆栽",
    "dining table": "餐桌",
    "laptop": "笔记本电脑",
    "cell phone": "手机",
    "book": "书",
    "clock": "时钟",
}


# 访问首页时，把网页模板发送给浏览器。
@app.route("/")
def index():
    # Flask 会自动寻找 templates/index.html。
    return render_template("index.html")


# 提供一个健康检查地址，用于确认服务和模型是否已经加载。
@app.route("/health")
def health():
    # 返回服务状态、模型路径和 CUDA 是否可用。
    return jsonify(
        {
            "status": "ok",
            "model_name": "YOLO11s V2",
            "imgsz": 512,
            "model": str(model_path),
            "cuda": bool(torch.cuda.is_available()),
        }
    )


# 接收浏览器发送的一帧图片，并返回检测框数据。
@app.route("/predict", methods=["POST"])
def predict():
    # 检查请求中是否包含名字为 image 的文件。
    if "image" not in request.files:
        # 如果没有图片，返回 400 错误和中文说明。
        return jsonify({"error": "请求中没有图片"}), 400

    # 读取浏览器上传的图片文件。
    image_file = request.files["image"]

    # 把上传文件转换成字节数据。
    image_bytes = image_file.read()

    # 如果图片是空的，直接返回错误，避免继续计算。
    if not image_bytes:
        # 返回 400 错误和中文说明。
        return jsonify({"error": "上传的图片为空"}), 400

    # 把图片字节转换成 OpenCV 可以处理的图像数组。
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)

    # 把压缩图片解码成彩色图像；失败时 frame 会是 None。
    frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    # 如果解码失败，说明上传内容不是有效图片。
    if frame is None:
        # 返回 400 错误和中文说明。
        return jsonify({"error": "无法解码上传的图片"}), 400

    # 取得图片高度和宽度，稍后告诉前端如何缩放检测框。
    height, width = frame.shape[:2]

    # 记录推理开始时间。
    start_time = time.perf_counter()

    # 让 YOLO 对当前帧执行检测，置信度阈值设为 0.35。
    results = model.predict(
        source=frame,
        conf=0.35,
        imgsz=512,
        device=0,
        verbose=False,
    )

    # 记录推理结束时间，并换算成毫秒。
    inference_ms = (time.perf_counter() - start_time) * 1000

    # 取出这一帧的检测结果；因为只传了一帧，所以使用第一个结果。
    result = results[0]

    # 准备一个列表保存所有检测框。
    boxes = []

    # 如果模型检测到了目标，就逐个整理检测框数据。
    if result.boxes is not None:
        # 把左上角和右下角坐标转换成普通 Python 列表。
        coordinates = result.boxes.xyxy.cpu().tolist()

        # 把置信度转换成普通 Python 列表。
        confidences = result.boxes.conf.cpu().tolist()

        # 把类别编号转换成普通 Python 列表。
        class_ids = result.boxes.cls.cpu().tolist()

        # 把每个检测框、置信度和类别组合起来。
        for coordinate, confidence, class_id in zip(coordinates, confidences, class_ids):
            # 把类别编号转换为整数。
            integer_id = int(class_id)

            # 查找该类别对应的英文名称。
            english_name = str(model.names[integer_id])

            # 优先使用中文名称，找不到时保留英文名称。
            display_name = class_name_cn.get(english_name, english_name)

            # 把当前检测框整理成字典。
            boxes.append(
                {
                    "x1": round(coordinate[0], 2),
                    "y1": round(coordinate[1], 2),
                    "x2": round(coordinate[2], 2),
                    "y2": round(coordinate[3], 2),
                    "confidence": round(confidence, 3),
                    "class_id": integer_id,
                    "class_name": display_name,
                }
            )

    # 把图片尺寸、推理耗时和检测框以 JSON 格式返回给浏览器。
    return jsonify(
        {
            "image_width": width,
            "image_height": height,
            "inference_ms": round(inference_ms, 2),
            "boxes": boxes,
        }
    )


# 只有直接运行这个文件时才启动网页服务。
if __name__ == "__main__":
    # 只监听本机地址，不对局域网或互联网公开。
    app.run(host="127.0.0.1", port=5001, debug=False, threaded=True)




