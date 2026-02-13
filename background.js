// 后台脚本 - 处理插件的后台逻辑

// 当插件图标被点击时，打开侧边栏
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// 设置侧边栏的默认行为
chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到来自内容脚本的消息:', message);
  
  // 将消息转发到侧边栏
  chrome.sidePanel.getOptions({ tabId: sender.tab.id }).then((options) => {
    if (options.enabled) {
      chrome.runtime.sendMessage(message);
    }
  }).catch((error) => {
    console.error('获取侧边栏选项失败:', error);
  });
});

// 初始化时检查并设置必要的权限
chrome.runtime.onInstalled.addListener(() => {
  console.log('插件已安装');
});