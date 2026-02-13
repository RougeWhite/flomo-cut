// 侧边栏交互逻辑

// 按钮元素
const selectBtn = document.getElementById('select-btn');
const fullTextBtn = document.getElementById('full-text-btn');
const saveBtn = document.getElementById('save-btn');
const contentArea = document.getElementById('content-area');
const menuBtn = document.getElementById('menu-btn');
const menuDropdown = document.getElementById('menu-dropdown');
const configApiKeyItem = document.getElementById('config-api-key');
// API Key 模态框元素
const apiKeyModal = document.getElementById('api-key-modal');
const apiKeyInput = document.getElementById('api-key-input');
const closeModalBtn = document.getElementById('close-modal');
const cancelApiKeyBtn = document.getElementById('cancel-api-key');
const saveApiKeyBtn = document.getElementById('save-api-key');
// 标签相关元素
const addTagBtn = document.getElementById('add-tag-btn');
const tagInputContainer = document.getElementById('tag-input-container');
const tagInput = document.getElementById('tag-input');
const tagInputClose = document.getElementById('tag-input-close');
const tagsContainer = document.getElementById('tags-container');
const customAlert = document.getElementById('custom-alert');
// 清空按钮
const clearContentBtn = document.getElementById('clear-content-btn');
// 作者信息模态框元素
const aboutAuthorItem = document.getElementById('about-author');
const authorModal = document.getElementById('author-modal');
const closeAuthorModalBtn = document.getElementById('close-author-modal');
const closeAuthorBtn = document.getElementById('close-author-btn');
// 获取 menuContainer 元素
const menuContainer = document.querySelector('.menu-container');
// 标签颜色数组
const tagColors = [
  { bg: '#e6f7ff', color: '#1890ff' },
  { bg: '#f6ffed', color: '#52c41a' },
  { bg: '#fffbe6', color: '#faad14' },
  { bg: '#fff1f0', color: '#f5222d' },
  { bg: '#f9f0ff', color: '#722ed1' }
];

// 按钮状态切换
selectBtn.addEventListener('click', () => {
  selectBtn.classList.add('active');
  fullTextBtn.classList.remove('active');
  
  // 发送消息给内容脚本，开始选取模式
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startSelection' });
    }
  });
});

fullTextBtn.addEventListener('click', () => {
  fullTextBtn.classList.add('active');
  selectBtn.classList.remove('active');
  
  // 发送消息给内容脚本，获取全文
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getFullText' });
    }
  });
});

// 移除内容中的 img 标签并用【】包裹 URL
function processImageTags(content) {
  // 使用正则表达式匹配 img 标签
  return content.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (match, url) => {
    return `【${url}】`;
  });
}

// 保存按钮点击事件
saveBtn.addEventListener('click', () => {
  // 检查按钮是否禁用
  if (saveBtn.disabled) {
    return;
  }
  
  const content = contentArea.innerHTML;
  if (!content || content === '输入内容...') {
    alert('请先输入内容');
    return;
  }
  
  // 获取 API Key
  const apiKey = localStorage.getItem('apiKey') || '';
  if (!apiKey) {
    alert('请先配置 API Key');
    return;
  }
  
  // 构建请求 URL - 确保格式正确
  let cleanApiKey = apiKey.trim();
  // 移除可能的完整 URL 前缀，只保留路径部分
  cleanApiKey = cleanApiKey.replace(/^https?:\/\/flomoapp\.com\/iwh\//, '');
  // 移除末尾的斜杠
  cleanApiKey = cleanApiKey.replace(/\/$/, '');
  const url = `https://flomoapp.com/iwh/${cleanApiKey}/`;
  
  // 获取所有标签并格式化为 # 标签
  let tagsText = '';
  const tagItems = tagsContainer.querySelectorAll('.tag-item');
  
  tagItems.forEach((tagItem, index) => {
    const tagName = tagItem.textContent.trim().replace('×', '').trim();
    if (tagName) {
      tagsText += `#${tagName} `;
    }
  });
  
  // 处理内容中的图片标签：移除 img 标签并用【】包裹 URL
  const processedContent = processImageTags(content);
  
  // 如果有标签，添加到内容前面
  let finalContent = processedContent;
  if (tagsText) {
    finalContent = tagsText + '\n\n' + processedContent;
  }
  
  // 构建请求体
  const requestBody = {
    content: finalContent,
    image_urls: storedImageUrls // 添加图片 URL 数组
  };
  
  // 发送POST请求到 flomo
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('网络响应错误');
    }
    return response.json();
  })
  .then(data => {
    console.log('保存成功:', data);
    showSaveNotification();
    // 清空内容区域
    contentArea.innerHTML = '输入内容...';
    // 更新保存按钮状态
    updateSaveButtonState();
    // 保存标签到本地存储（带过期时间）
    saveTagsToLocalStorage();
  })
  .catch(error => {
    console.error('保存失败:', error);
    alert('保存失败，请检查 API Key 是否正确');
  });
});

// 显示保存成功通知
function showSaveNotification(message = '保存成功') {
  // 检查是否已有通知
  const existingNotification = document.querySelector('.save-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = 'save-notification';
  notification.textContent = message;
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 3秒后添加退出动画并移除
  setTimeout(() => {
    if (notification.parentNode) {
      // 添加退出动画类
      notification.style.transition = 'all 0.3s ease-out';
      notification.style.transform = 'translateX(-100%)';
      notification.style.opacity = '0';
      
      // 动画结束后移除元素
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}

// 存储图片 URL 数组
let storedImageUrls = [];

// 消息去重机制
let lastMessageTime = 0;
let lastMessageAction = '';
const MESSAGE_DEBOUNCE_TIME = 100; // 100毫秒去重时间

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 消息去重检查
  const currentTime = Date.now();
  if (message.action === lastMessageAction && (currentTime - lastMessageTime) < MESSAGE_DEBOUNCE_TIME) {
    console.log('重复消息被过滤:', message.action);
    return;
  }
  lastMessageTime = currentTime;
  lastMessageAction = message.action;
  
  if (message.action === 'selectionComplete') {
    let fullContent = '';
    const pageInfo = message.pageInfo;
    
    // 存储图片 URL 数组
    storedImageUrls = message.image_urls || [];
    
    if (message.selections) {
          // 处理新的selections格式（移除截图显示）
          message.selections.forEach(selection => {
            // 只显示文字内容（如果有）
            if (selection.textContent && selection.textContent.trim() !== '') {
              fullContent += `<blockquote style="margin: 8px 0; padding: 12px; background-color: #f5f5f5; border-left: 4px solid #52c41a; border-radius: 0 4px 4px 0; font-style: italic; font-weight: bold;">${selection.textContent}</blockquote>`;
              fullContent += '<br>';
            }
          });
        } else if (message.content) {
      // 兼容旧的content格式
      fullContent += message.content;
    }
    
    // 添加markdown格式的引用
    if (pageInfo) {
      fullContent += `\n\n---\n来自：[${pageInfo.title}] |「URL」${pageInfo.url}`;
    }
    
    // 将内容叠加到侧边栏
    if (contentArea.innerHTML === '输入内容...' || !contentArea.innerHTML.trim()) {
      // 如果是初始状态，直接设置内容
      contentArea.innerHTML = fullContent;
    } else {
      // 否则追加内容
      contentArea.innerHTML += fullContent;
    }
  } else if (message.action === 'fullTextReceived') {
    // 存储图片 URL 数组
    storedImageUrls = message.image_urls || [];
    
    // 获取全文时覆盖现有内容
    let fullContent = message.content;
    
    // 添加图片 HTML
    if (message.imagesHtml) {
      fullContent += message.imagesHtml;
    }
    
    // 添加markdown格式的引用
    const pageInfo = message.pageInfo;
    if (pageInfo) {
      fullContent += `\n\n---\n来自：[${pageInfo.title}] |「URL」${pageInfo.url}`;
    }
    
    // 使用 innerHTML 而不是 textContent，确保图片能正确显示
    contentArea.innerHTML = fullContent;
  }
});

// 初始化内容区域点击事件，清除默认提示文字
contentArea.addEventListener('focus', () => {
  if (contentArea.innerHTML === '输入内容...') {
    contentArea.innerHTML = '';
  }
});

// 检查内容并更新保存按钮状态
function updateSaveButtonState() {
  const content = contentArea.innerHTML;
  const hasContent = content && content !== '输入内容...' && content.trim() !== '';
  saveBtn.disabled = !hasContent;
}

// 监听内容变化
contentArea.addEventListener('input', updateSaveButtonState);
contentArea.addEventListener('blur', updateSaveButtonState);
contentArea.addEventListener('keyup', updateSaveButtonState);
contentArea.addEventListener('paste', updateSaveButtonState);
contentArea.addEventListener('cut', updateSaveButtonState);
contentArea.addEventListener('keydown', updateSaveButtonState);
contentArea.addEventListener('change', updateSaveButtonState);

// 为 contenteditable 元素添加 MutationObserver，监听内容变化
const observer = new MutationObserver(updateSaveButtonState);
observer.observe(contentArea, {
  childList: true,
  subtree: true,
  characterData: true
});

// 页面加载时初始化保存按钮状态
window.addEventListener('load', updateSaveButtonState);

// 菜单按钮点击事件
menuBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // 阻止事件冒泡
  menuDropdown.classList.toggle('show');
});

// 点击其他地方关闭菜单
document.addEventListener('click', (e) => {
  if (!menuContainer.contains(e.target)) {
    menuDropdown.classList.remove('show');
  }
});

// 配置 API Key 菜单项点击事件
configApiKeyItem.addEventListener('click', () => {
  const currentApiKey = localStorage.getItem('apiKey') || '';
  apiKeyInput.value = currentApiKey;
  apiKeyModal.classList.add('show');
  
  // 关闭菜单
  menuDropdown.classList.remove('show');
});

// 关闭模态框
function closeApiKeyModal() {
  apiKeyModal.classList.remove('show');
}

// 关闭按钮点击事件
closeModalBtn.addEventListener('click', closeApiKeyModal);

// 取消按钮点击事件
cancelApiKeyBtn.addEventListener('click', closeApiKeyModal);

// 保存按钮点击事件
saveApiKeyBtn.addEventListener('click', () => {
  const newApiKey = apiKeyInput.value.trim();
  localStorage.setItem('apiKey', newApiKey);
  
  // 显示保存成功通知
  showSaveNotification('API Key 已保存');
  closeApiKeyModal();
});

// 点击模态框外部关闭
apiKeyModal.addEventListener('click', (e) => {
  if (e.target === apiKeyModal) {
    closeApiKeyModal();
  }
});

// 关于作者菜单项点击事件
aboutAuthorItem.addEventListener('click', () => {
  authorModal.classList.add('show');
  // 关闭菜单下拉框
  menuDropdown.classList.remove('show');
});

// 关闭作者信息模态框
function closeAuthorModal() {
  authorModal.classList.remove('show');
}

// 关闭作者信息模态框按钮点击事件
closeAuthorModalBtn.addEventListener('click', closeAuthorModal);
closeAuthorBtn.addEventListener('click', closeAuthorModal);

// 点击作者信息模态框外部关闭
authorModal.addEventListener('click', (e) => {
  if (e.target === authorModal) {
    closeAuthorModal();
  }
});

// 添加标签按钮点击事件
addTagBtn.addEventListener('click', () => {
  // 检查是否已经达到最大标签数量
  const currentTags = tagsContainer.querySelectorAll('.tag-item');
  if (currentTags.length >= 10) {
    showCustomAlert('最多只能添加10个标签');
    return;
  }
  
  // 显示标签输入框
  tagInputContainer.style.display = 'block';
  tagInput.focus();
});

// 标签输入框回车事件
tagInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const tagName = tagInput.value.trim();
    if (tagName) {
      addTag(tagName);
      tagInput.value = '';
      // 不关闭输入框，保持打开状态
    }
  }
});

// 标签输入框关闭按钮点击事件
tagInputClose.addEventListener('click', () => {
  tagInputContainer.style.display = 'none';
});

// 点击其他地方关闭标签输入框
document.addEventListener('click', (e) => {
  // 检查是否点击了标签删除按钮或标签本身
  if (e.target.classList.contains('tag-delete') || e.target.closest('.tag-item')) {
    return;
  }
  
  // 检查是否点击了标签输入框或添加标签按钮
  if (!tagInputContainer.contains(e.target) && e.target !== addTagBtn) {
    tagInputContainer.style.display = 'none';
  }
});

// 添加标签函数
function addTag(tagName) {
  const currentTags = tagsContainer.querySelectorAll('.tag-item');
  if (currentTags.length >= 10) {
    showCustomAlert('最多只能添加10个标签');
    return;
  }
  
  // 创建标签元素
  const tagItem = document.createElement('div');
  tagItem.className = 'tag-item';
  
  // 随机选择标签颜色
  const colorIndex = Math.floor(Math.random() * tagColors.length);
  const color = tagColors[colorIndex];
  tagItem.style.backgroundColor = color.bg;
  tagItem.style.color = color.color;
  
  // 创建标签内容
  tagItem.innerHTML = `
    ${tagName}
    <button class="tag-delete">&times;</button>
  `;
  
  // 添加删除按钮点击事件
  const deleteBtn = tagItem.querySelector('.tag-delete');
  deleteBtn.addEventListener('click', function() {
    deleteTag(this);
  });
  
  // 添加到标签容器
  tagsContainer.appendChild(tagItem);
}

// 删除标签函数
function deleteTag(deleteBtn) {
  const tagItem = deleteBtn.parentElement;
  tagItem.style.animation = 'tagSlideOut 0.3s ease-out';
  setTimeout(() => {
    tagItem.remove();
  }, 300);
}

// 添加标签退出动画
const style = document.createElement('style');
style.textContent = `
@keyframes tagSlideOut {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-10px);
    opacity: 0;
  }
}
`;
document.head.appendChild(style);

// 显示自定义提示函数
function showCustomAlert(message) {
  // 设置提示消息
  customAlert.textContent = message;
  
  // 显示提示
  customAlert.style.display = 'flex';
  customAlert.style.animation = 'notificationSlideIn 0.3s ease-out';
  
  // 3秒后隐藏提示
  setTimeout(() => {
    customAlert.style.transition = 'all 0.3s ease-out';
    customAlert.style.transform = 'translateX(-100%)';
    customAlert.style.opacity = '0';
    
    setTimeout(() => {
      customAlert.style.display = 'none';
      customAlert.style.transition = '';
      customAlert.style.transform = '';
      customAlert.style.opacity = '';
    }, 300);
  }, 3000);
}

// 保存标签到本地存储（带过期时间）
function saveTagsToLocalStorage() {
  const tags = [];
  const tagItems = tagsContainer.querySelectorAll('.tag-item');
  
  tagItems.forEach(tagItem => {
    const tagName = tagItem.textContent.trim().replace('×', '').trim();
    const bgColor = tagItem.style.backgroundColor;
    const textColor = tagItem.style.color;
    
    tags.push({
      name: tagName,
      bgColor: bgColor,
      textColor: textColor
    });
  });
  
  // 设置12小时过期时间
  const expiryTime = Date.now() + (12 * 60 * 60 * 1000);
  
  const tagData = {
    tags: tags,
    expiry: expiryTime
  };
  
  localStorage.setItem('savedTags', JSON.stringify(tagData));
}

// 从本地存储加载标签
function loadTagsFromLocalStorage() {
  const savedTagData = localStorage.getItem('savedTags');
  if (!savedTagData) return;
  
  try {
    const tagData = JSON.parse(savedTagData);
    const currentTime = Date.now();
    
    // 检查是否过期
    if (currentTime > tagData.expiry) {
      localStorage.removeItem('savedTags');
      return;
    }
    
    // 加载标签
    tagData.tags.forEach(tag => {
      const tagItem = document.createElement('div');
      tagItem.className = 'tag-item';
      tagItem.style.backgroundColor = tag.bgColor;
      tagItem.style.color = tag.textColor;
      tagItem.innerHTML = `
        ${tag.name}
        <button class="tag-delete">&times;</button>
      `;
      
      // 添加删除按钮点击事件
      const deleteBtn = tagItem.querySelector('.tag-delete');
      deleteBtn.addEventListener('click', function() {
        deleteTag(this);
      });
      
      tagsContainer.appendChild(tagItem);
    });
  } catch (error) {
    console.error('加载标签失败:', error);
    localStorage.removeItem('savedTags');
  }
}

// 页面加载时检查过期标签并加载
window.addEventListener('load', () => {
  loadTagsFromLocalStorage();
});

// 清空按钮点击事件
clearContentBtn.addEventListener('click', () => {
  // 清空内容区域
  contentArea.innerHTML = '输入内容...';
  // 更新保存按钮状态
  updateSaveButtonState();
  // 显示清空成功提示
  showSaveNotification('内容已清空');
});