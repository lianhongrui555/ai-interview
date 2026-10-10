# YOLO V2 性能增强版

V2 使用 YOLO11s 和 512 像素输入，在 COCO128 验证集上同时改善了准确率和网页响应速度。

## 最终结果

| 项目 | V1 | V2 |
|---|---:|---:|
| 模型 | YOLO11n | YOLO11s |
| 输入尺寸 | 640 | 512 |
| mAP50 | 0.742 | 0.904 |
| mAP50-95 | 0.567 | 0.769 |
| 网页客户端中位数 | 172.81 ms | 140.35 ms |
| 网页平均帧率 | 5.85 FPS | 7.30 FPS |

## 启动 V2 网页

双击 `start_web_v2.cmd`，然后打开：

`http://127.0.0.1:5001`

点击“启动摄像头”，浏览器询问权限时选择“允许”。

## 主要文件

- `train_yolo_v2.py`：训练 YOLO11s。
- `benchmark_models.py`：比较 V1 与 V2 的模型速度。
- `validate_sizes.py`：比较不同输入尺寸的准确率。
- `benchmark_web_servers.py`：原始的网页服务测试脚本。
- `benchmark_web_single.py`：一次只测一个网页服务的公平测试脚本。
- `web_app_v2.py`：V2 网页服务。
- `templates/index.html`：浏览器摄像头和检测框页面。
- `runs/train/coco128_yolo11s_v2/weights/best.pt`：V2 最佳模型。
