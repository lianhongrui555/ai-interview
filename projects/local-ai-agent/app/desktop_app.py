# 导入 threading 工具，用于在后台线程中运行网页服务器。
import threading

# 导入 webview 工具，用于创建独立桌面窗口。
import webview

# 导入 make_server，用于启动 Flask 网页服务。
from werkzeug.serving import make_server

# 从 web_app.py 导入已经配置好的 Flask 应用。
from web_app import app

# 定义启动后台网页服务器的函数。
def start_server():
    # 使用端口 0，让系统自动选择一个没有被占用的端口。
    server = make_server("127.0.0.1", 0, app)
    # 读取系统实际分配的端口号。
    port = server.server_port
    # 创建后台线程来运行网页服务器。
    server_thread = threading.Thread(
        # 指定线程要执行的方法。
        target=server.serve_forever,
        # 设置为守护线程，主窗口关闭后它会自动结束。
        daemon=True,
    )
    # 启动后台网页服务器线程。
    server_thread.start()
    # 把服务器对象和端口号返回给主程序。
    return server, port

# 定义桌面应用主函数。
def main():
    # 启动后台网页服务，并取得服务器对象和端口号。
    server, port = start_server()
    # 根据实际端口生成桌面窗口要访问的网址。
    url = f"http://127.0.0.1:{port}/"
    # 创建桌面窗口，设置标题、网址和初始大小。
    webview.create_window(
        # 设置窗口标题。
        title="本地 AI 聊天",
        # 加载本地聊天网页。
        url=url,
        # 设置初始窗口宽度。
        width=1100,
        # 设置初始窗口高度。
        height=800,
        # 设置窗口最小宽度。
        min_size=(760, 560),
        # 允许在页面中选中文字。
        text_select=True,
    )
    # 使用 try/finally 确保关闭窗口后一定停止后台服务器。
    try:
        # 启动桌面窗口，程序会在这里等待窗口关闭。
        webview.start()
    # 无论正常关闭还是发生错误，都执行下面的清理代码。
    finally:
        # 停止 Flask 后台服务器。
        server.shutdown()

# 只有直接运行这个文件时才启动桌面应用。
if __name__ == "__main__":
    # 调用桌面应用主函数。
    main()
