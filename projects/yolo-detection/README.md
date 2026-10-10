# YOLO 实时目标检测

这是一个从数据训练、模型评估到浏览器摄像头实时推理的完整 YOLO 项目。

项目完成了 V1 到 V2 的工程迭代：

- V1：先使用轻量模型跑通训练和实时检测闭环。
- V2：通过更大模型、训练策略优化和推理尺寸实验，同时提升准确率与网页响应速度。

## 整体构建思路

```text
COCO128 数据集
→ YOLO 预训练权重
→ GPU 训练
→ 最佳模型 best.pt
→ Flask 推理服务
→ 浏览器摄像头获取画面
→ 上传图片到后端
→ YOLO 推理并返回检测框
→ Canvas 实时绘制结果
```

## V1：跑通完整闭环

V1 使用 `YOLO11n`，重点是验证训练、推理和前端显示是否能够完整连接。

训练参数：

- 模型：`yolo11n.pt`
- 数据集：`coco128.yaml`
- 训练轮数：10
- 输入尺寸：640
- 批量大小：16
- GPU：设备 0
- 随机种子：42

V1 推理流程：

1. 浏览器通过摄像头获取画面。
2. 将当前帧编码为 JPEG。
3. 通过 `POST /predict` 上传到 Flask。
4. 后端使用 OpenCV 解码图片。
5. YOLO 进行目标检测并返回边界框。
6. 浏览器使用 Canvas 绘制检测框、类别和置信度。

## V2：性能增强

V2 使用 `YOLO11s`，在 V1 的基础上增加训练轮数和训练优化策略。

训练参数：

- 模型：`yolo11s.pt`
- 数据集：`coco128.yaml`
- 训练轮数：50
- 训练尺寸：640
- 批量大小：8
- 自动混合精度：开启
- 余弦学习率：开启
- 最后 10 轮关闭 Mosaic
- 早停耐心值：15
- 随机种子：42

最终网页使用 YOLO11s + 512 像素输入。该尺寸不是随意选择的，而是通过 640、512、480 三种尺寸的准确率和速度对比后得到的平衡点。

## 最终结果

| 指标 | V1：YOLO11n / 640 | V2：YOLO11s / 512 |
|---|---:|---:|
| mAP50 | 0.742 | 0.904 |
| mAP50-95 | 0.567 | 0.769 |
| 网页客户端中位数 | 172.81 ms | 140.35 ms |
| 网页平均帧率 | 5.85 FPS | 7.30 FPS |
| 服务端推理中位数 | 104.43 ms | 94.94 ms |

V2 在 512 像素输入下的验证结果：

```text
Precision：0.9124
Recall：0.8385
mAP50：0.9038
mAP50-95：0.7687
```

## 运行 V1

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -X utf8 train_yolo.py
```

启动 V1 网页：

```powershell
.\start_web.cmd
```

打开：

```text
http://127.0.0.1:5000
```

## 运行 V2

```powershell
cd advanced
..\.venv\Scripts\python.exe -X utf8 train_yolo_v2.py
```

启动 V2 网页：

```powershell
.\start_web_v2.cmd
```

打开：

```text
http://127.0.0.1:5001
```

## 主要目录

```text
YOLO-Detection/
├─ train_yolo.py
├─ web_app.py
├─ templates/
├─ runs/train/coco128_yolo11n/
├─ advanced/
│  ├─ train_yolo_v2.py
│  ├─ validate_sizes.py
│  ├─ benchmark_web_single.py
│  ├─ web_app_v2.py
│  ├─ templates/
│  └─ runs/train/coco128_yolo11s_v2/
└─ docs/2026-10-05.md
```

## 工程总结

这个项目的推进方式是：

```text
先跑通
→ 保存真实训练结果
→ 测量准确率
→ 测量网页延迟和帧率
→ 做对照实验
→ 选择最适合目标的配置
```

这比一开始就追求最复杂模型更适合实际工程，因为每一步都有可验证结果，也能明确知道升级是否真的带来了收益。
