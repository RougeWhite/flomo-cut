// IMA 笔记插件 - 后台脚本

// 打开侧边栏
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// 设置侧边栏默认行为
chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message);
  
  // 处理 COS 上传请求
  if (message.action === 'uploadToCos') {
    uploadToCos(message.data)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('COS 上传失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // 保持消息通道开启
  }
  
  // 转发消息到侧边栏
  chrome.sidePanel.getOptions({ tabId: sender.tab.id }).then((options) => {
    if (options && options.enabled) {
      chrome.runtime.sendMessage(message);
    }
  }).catch((error) => {
    console.error('获取侧边栏选项失败:', error);
  });
});

// COS 上传函数
async function uploadToCos({ blob, credential }) {
  const {
    secret_id,
    secret_key,
    token,
    bucket_name,
    region,
    cos_key
  } = credential;
  
  // 构建 COS 上传 URL
  const uploadUrl = `https://${bucket_name}.cos.${region}.myqcloud.com${cos_key.startsWith('/') ? '' : '/'}${cos_key}`;
  
  // 将 blob 转换为 ArrayBuffer
  const arrayBuffer = await blob.arrayBuffer();
  
  // 上传到 COS
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': blob.type || 'application/octet-stream',
      'x-cos-security-token': token,
      'Authorization': await generateCOSAuth(secret_id, secret_key, token, uploadUrl)
    },
    body: arrayBuffer
  });
  
  if (!response.ok) {
    throw new Error(`COS 上传失败: ${response.status} ${response.statusText}`);
  }
  
  return {
    url: uploadUrl,
    cos_key: cos_key
  };
}

// 生成 COS 签名（简化版本）
async function generateCOSAuth(secretId, secretKey, token, url) {
  // 简化实现：使用临时凭证直接访问
  // 实际生产环境可能需要更复杂的签名算法
  const date = new Date().toISOString().split('T')[0];
  
  // 返回 Basic Auth 格式（示例）
  // 实际应该使用 COS SDK 或服务端签名
  return `q-sign-algorithm=sha1&q-ak=${secretId}&q-sign-time=${Date.now()}/${Date.now() + 3600000}`;
}

// 初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('IMA 笔记插件已安装');
});
