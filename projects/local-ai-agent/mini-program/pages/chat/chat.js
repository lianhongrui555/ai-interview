// 保存本地 Flask 后端的聊天接口地址。
const API_URL = 'http://127.0.0.1:5000/api/chat'

// 创建聊天页面，并设置页面初始数据与事件处理函数。
Page({
  // 保存页面第一次打开时需要的数据。
  data: {
    // messages 保存所有聊天消息。
    messages: [
      {
        // id 用于滚动到最新消息。
        id: 1,
        // role 用来区分用户和 AI。
        role: 'assistant',
        // content 是消息文字。
        content: '你好，我是运行在你电脑上的 AI 助手。请输入问题开始聊天。',
      },
    ],
    // input 保存输入框当前内容。
    input: '',
    // conversationId 保存 Dify 返回的对话编号。
    conversationId: '',
    // sending 表示当前是否正在等待回答。
    sending: false,
    // scrollIntoView 保存需要滚动到的消息编号。
    scrollIntoView: 'msg-1',
  },

  // 监听输入框内容变化。
  onInput(event) {
    // 把输入内容同步到页面数据。
    this.setData({ input: event.detail.value })
  },

  // 把一条新消息加入聊天列表。
  addMessage(role, content) {
    // 使用当前时间生成近似唯一的消息编号。
    const id = Date.now()
    // 复制原消息数组并追加新消息。
    const messages = this.data.messages.concat({ id, role, content })
    // 更新页面数据并自动滚动到最新消息。
    this.setData({
      messages,
      scrollIntoView: `msg-${id}`,
    })
  },

  // 发送用户问题到 Flask 后端。
  onSend() {
    // 去掉问题首尾空格。
    const question = this.data.input.trim()
    // 空消息或正在发送时直接返回。
    if (!question || this.data.sending)
      return

    // 立即显示用户消息。
    this.addMessage('user', question)
    // 清空输入框并显示等待状态。
    this.setData({ input: '', sending: true })

    // 记录当前页面对象，供请求回调使用。
    const that = this
    // 调用本地 Flask 后端。
    wx.request({
      // 请求后端聊天接口。
      url: API_URL,
      // 使用 POST 请求。
      method: 'POST',
      // 小程序最长请求时间为 60 秒。
      timeout: 60000,
      // 设置 JSON 请求头。
      header: {
        'content-type': 'application/json',
      },
      // 发送用户问题与当前对话编号。
      data: {
        message: question,
        conversation_id: that.data.conversationId,
      },
      // 请求成功时执行。
      success(response) {
        // 读取后端返回的数据。
        const data = response.data || {}
        // 判断 HTTP 状态码是否成功。
        if (response.statusCode >= 200 && response.statusCode < 300 && data.answer) {
          // 保存新的对话编号，让下一条消息延续上下文。
          that.setData({ conversationId: data.conversation_id || that.data.conversationId })
          // 显示 AI 回答。
          that.addMessage('assistant', data.answer)
        } else {
          // 显示后端返回的错误信息。
          that.addMessage('assistant', `出错了：${data.error || `HTTP ${response.statusCode}`}`)
        }
      },
      // 网络请求失败时执行。
      fail(error) {
        // 显示容易理解的网络错误。
        that.addMessage('assistant', `网络请求失败：${error.errMsg}`)
      },
      // 不论成功或失败都恢复发送按钮。
      complete() {
        that.setData({ sending: false })
      },
    })
  },

  // 点击“新对话”时清空上下文和消息。
  onNewChat() {
    // 重置对话编号和消息列表。
    this.setData({
      conversationId: '',
      sending: false,
      input: '',
      messages: [
        {
          id: Date.now(),
          role: 'assistant',
          content: '已经开始新对话。请输入问题。',
        },
      ],
      scrollIntoView: '',
    })
  },
})
