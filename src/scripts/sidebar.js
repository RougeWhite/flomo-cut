// IMA 笔记插件 - 侧边栏交互逻辑

// IMA API 配置
const IMA_API_BASE = 'https://ima.qq.com';
const IMA_API_PATHS = {
  LIST_KB: '/openapi/wiki/v1/search_knowledge_base',
  ADD_KNOWLEDGE: '/openapi/wiki/v1/add_knowledge',
  IMPORT_DOC: '/openapi/note/v1/import_doc'
};

// DOM 元素
const selectBtn = document.getElementById('select-btn');
const fullTextBtn = document.getElementById('full-text-btn');
const saveBtn = document.getElementById('save-btn');
const mdSource = document.getElementById('md-source');
const contentPreview = document.getElementById('content-preview');
const menuBtn = document.getElementById('menu-btn');
const menuDropdown = document.getElementById('menu-dropdown');
const apiModal = document.getElementById('api-modal');
const clientIdInput = document.getElementById('client-id-input');
const apiKeyInput = document.getElementById('api-key-input');
const closeModalBtn = document.getElementById('close-modal');
const cancelApiBtn = document.getElementById('cancel-api');
const saveApiBtn = document.getElementById('save-api');
const configImaItem = document.getElementById('config-ima');
const refreshKbItem = document.getElementById('refresh-kb');
const settingsItem = document.getElementById('settings');
const kbSelector = document.getElementById('kb-selector');
const customAlert = document.getElementById('custom-alert');
const clearContentBtn = document.getElementById('clear-content-btn');
const unlockPopup = document.getElementById('unlock-popup');
const modeHint = document.getElementById('mode-hint');
const aboutAuthorItem = document.getElementById('about-author');
const authorModal = document.getElementById('author-modal');
const closeAuthorModalBtn = document.getElementById('close-author-modal');
const closeAuthorBtn = document.getElementById('close-author-btn');
const quickConfigBtn = document.getElementById('quick-config-btn');
const quickConfigModal = document.getElementById('quick-config-modal');
const closeQuickConfigBtn = document.getElementById('close-quick-config');
const credentialInput = document.getElementById('credential-input');
const applyQuickConfigBtn = document.getElementById('apply-quick-config');
const getCredentialBtn = document.getElementById('get-credential-btn');
const toggleMdBtn = document.getElementById('toggle-md-btn');

// Markdown 编辑状态
let isMdMode = false;

// 消息去重
let lastMessageTime = 0;
let lastMessageAction = '';
const MESSAGE_DEBOUNCE_TIME = 100;

// 获取 IMA 凭证
function getImaCredentials() {
  return {
    clientId: localStorage.getItem('imaClientId') || '',
    apiKey: localStorage.getItem('imaApiKey') || ''
  };
}

// 检查是否已配置
function isConfigured() {
  const creds = getImaCredentials();
  return creds.clientId && creds.apiKey;
}

// IMA API 调用
async function imaApi(apiPath, body) {
  const creds = getImaCredentials();
  
  if (!creds.clientId || !creds.apiKey) {
    throw new Error('请先配置 IMA API');
  }

  const response = await fetch(`${IMA_API_BASE}${apiPath}`, {
    method: 'POST',
    headers: {
      'ima-openapi-clientid': creds.clientId,
      'ima-openapi-apikey': creds.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.msg || 'API 调用失败');
  }
  
  return data;
}

// 按钮状态切换
selectBtn.addEventListener('click', () => {
  selectBtn.classList.add('active');
  fullTextBtn.classList.remove('active');
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startSelection' });
    }
  });
});

fullTextBtn.addEventListener('click', () => {
  fullTextBtn.classList.add('active');
  selectBtn.classList.remove('active');
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getFullText' });
    }
  });
});

// 保存按钮点击事件
saveBtn.addEventListener('click', async () => {
  if (saveBtn.disabled) return;
  
  if (!isConfigured()) {
    showCustomAlert('请先配置 IMA API');
    apiModal.classList.add('show');
    return;
  }
  
  const kbId = kbSelector.value;
  if (!kbId) {
    showCustomAlert('请选择知识库');
    return;
  }
  
  const content = mdSource.value;
  if (!content || !content.trim()) {
    showCustomAlert('请先输入内容');
    return;
  }
  
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';
  
  try {
    await createNote(content, kbId);
    
    showSaveNotification('保存成功');
    mdSource.value = '';
    localStorage.removeItem('draftMdSource');
    updateSaveButtonState();
  } catch (error) {
    console.error('保存失败:', error);
    showCustomAlert(error.message || '保存失败');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '保 存';
  }
});

// 创建笔记
async function createNote(content, kbId) {
  // content 已经是 Markdown 格式
  const mdContent = content;
  
  // 生成标题
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const title = `# ${year}年${month}月${day}日 ${hours}:${minutes}:${seconds} 剪藏的内容\n\n`;
  
  // Step 1: 创建笔记到个人笔记本
  const importResponse = await imaApi(IMA_API_PATHS.IMPORT_DOC, {
    content_format: 1,
    content: title + mdContent
  });
  
  const noteId = importResponse.data.note_id;
  console.log('笔记创建成功, note_id:', noteId);
  
  // Step 2: 将笔记添加到知识库
  if (kbId && noteId) {
    await addNoteToKnowledgeBase(kbId, noteId, title + mdContent);
  }
  
  return importResponse;
}

// 将笔记添加到知识库
async function addNoteToKnowledgeBase(kbId, noteId, content) {
  // 从内容中提取标题（第一行）
  const titleMatch = content.match(/^#\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '无标题笔记';
  
  await imaApi(IMA_API_PATHS.ADD_KNOWLEDGE, {
    media_type: 11,
    note_info: {
      content_id: noteId
    },
    title: title,
    knowledge_base_id: kbId
  });
  
  console.log('笔记已添加到知识库:', kbId);
}

// 解码 HTML 实体
function decodeHTMLEntities(text) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

// 从 localStorage 加载知识库缓存
function loadKbFromCache() {
  const cachedKb = localStorage.getItem('cachedKbList');
  if (!cachedKb) return null;
  
  try {
    const data = JSON.parse(cachedKb);
    return data.kbList || [];
  } catch {
    return null;
  }
}

// 保存知识库到 localStorage
function saveKbToCache(kbList) {
  const data = {
    kbList: kbList,
    timestamp: Date.now()
  };
  localStorage.setItem('cachedKbList', JSON.stringify(data));
}

// 渲染知识库列表
function renderKbSelector(kbList) {
  const lastSelectedKb = localStorage.getItem('selectedKbId') || '';
  
  if (kbList.length === 0) {
    kbSelector.innerHTML = '<option value="">暂无知识库</option>';
    return;
  }
  
  kbSelector.innerHTML = '<option value="">选择知识库...</option>';
  kbList.forEach(kb => {
    const option = document.createElement('option');
    option.value = kb.kb_id;
    option.textContent = kb.kb_name;
    if (kb.kb_id === lastSelectedKb) {
      option.selected = true;
    }
    kbSelector.appendChild(option);
  });
}

// 获取知识库列表
async function fetchKnowledgeBases() {
  if (!isConfigured()) {
    kbSelector.innerHTML = '<option value="">请先配置 IMA API</option>';
    return;
  }
  
  // 优先从缓存加载
  const cachedKbList = loadKbFromCache();
  if (cachedKbList && cachedKbList.length > 0) {
    renderKbSelector(cachedKbList);
  } else {
    kbSelector.innerHTML = '<option value="">加载中...</option>';
  }
  
  // 异步获取最新数据
  try {
    const response = await imaApi(IMA_API_PATHS.LIST_KB, {
      query: '',
      cursor: '',
      limit: 20
    });
    
    const kbList = response.data.info_list || [];
    
    // 保存到缓存
    saveKbToCache(kbList);
    
    // 渲染列表
    renderKbSelector(kbList);
    
  } catch (error) {
    console.error('获取知识库列表失败:', error);
    // 如果缓存有数据，不显示错误，只保留缓存
    if (!cachedKbList || cachedKbList.length === 0) {
      kbSelector.innerHTML = '<option value="">获取失败</option>';
      showCustomAlert('获取知识库列表失败: ' + error.message);
    }
  }
}

// 监听知识库选择变化
kbSelector.addEventListener('change', () => {
  localStorage.setItem('selectedKbId', kbSelector.value);
});

// 显示保存成功通知
function showSaveNotification(message = '保存成功') {
  const existingNotification = document.querySelector('.save-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = 'save-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transition = 'all 0.3s ease-out';
      notification.style.transform = 'translateX(-100%)';
      notification.style.opacity = '0';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    
    if (message.selections) {
      message.selections.forEach(selection => {
        if (selection.textContent && selection.textContent.trim() !== '') {
          fullContent += `${selection.textContent}\n\n`;
        }
      });
    }
    
    if (pageInfo) {
      fullContent += `---\n\n> 来自：[${pageInfo.title}] |「URL」${pageInfo.url}`;
    }
    
    // 检查追加前内容是否为空
    const wasEmpty = !mdSource.value.trim();
    
    // 追加到 mdSource textarea
    if (wasEmpty) {
      mdSource.value = fullContent;
    } else {
      mdSource.value += '\n\n' + fullContent;
    }
    
    // 如果内容为空，切换到预览模式；否则保持当前状态
    if (wasEmpty) {
      isMdMode = true;
      toggleMdBtn.classList.add('active');
      mdSource.style.display = 'none';
      contentPreview.style.display = 'block';
      renderPreview();
      
      // 读取设置，根据设置决定是否显示提示
      const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      if (settings.dblclickEdit === false) {
        // 未开启双击切换，显示提示
        setTimeout(() => {
          showPreviewModeHint();
        }, 300);
      }
    } else if (isMdMode) {
      // 如果内容不为空且在预览模式，更新预览
      renderPreview();
    }
    
    // 保存到 localStorage
    localStorage.setItem('draftMdSource', mdSource.value);
  } else if (message.action === 'fullTextReceived') {
    let fullContent = message.content;
    
    if (message.imagesHtml) {
      fullContent += message.imagesHtml;
    }
    
    const pageInfo = message.pageInfo;
    if (pageInfo) {
      fullContent += `\n\n---\n\n> 来自：[${pageInfo.title}] |「URL」${pageInfo.url}`;
    }
    
    // 检查追加前内容是否为空
    const wasEmpty = !mdSource.value.trim();
    
    // 追加到 mdSource textarea
    if (wasEmpty) {
      mdSource.value = fullContent;
    } else {
      mdSource.value += '\n\n' + fullContent;
    }
    
    if (isMdMode) {
      renderPreview();
    }
    
    // 保存到 localStorage
    localStorage.setItem('draftMdSource', mdSource.value);
  }
});

// 检查内容并更新保存按钮状态
function updateSaveButtonState() {
  const hasContent = mdSource.value.trim() !== '';
  saveBtn.disabled = !hasContent;
}

// 监听 mdSource 内容变化
mdSource.addEventListener('input', updateSaveButtonState);

window.addEventListener('load', () => {
  updateSaveButtonState();
  fetchKnowledgeBases();
  
  // 恢复 mdSource textarea 内容
  const cachedMdSource = localStorage.getItem('draftMdSource');
  if (cachedMdSource) {
    mdSource.value = cachedMdSource;
  }
  
  // 更新按钮状态
  if (mdSource.value) {
    saveBtn.disabled = false;
  }
});

// 使用 marked.js 渲染 Markdown 源码到预览区
function renderPreview() {
  const mdText = mdSource.value;
  if (!mdText.trim()) {
    contentPreview.innerHTML = '';
    return;
  }
  
  const html = marked.parse(mdText);
  contentPreview.innerHTML = `<div class="markdown-body">${html}</div>`;
}

// Markdown 模式切换（源码编辑 <-> 预览）
toggleMdBtn.addEventListener('click', () => {
  // 预览模式下点击直接切换
  if (isMdMode) {
    switchToEditMode();
  } else {
    // 编辑模式切换到预览模式
    isMdMode = true;
    toggleMdBtn.classList.add('active');
    mdSource.style.display = 'none';
    contentPreview.style.display = 'block';
    renderPreview();
  }
});

// 实时保存用户输入到 localStorage
mdSource.addEventListener('input', () => {
  localStorage.setItem('draftMdSource', mdSource.value);
  
  // 如果在预览模式，实时渲染
  if (isMdMode) {
    renderPreview();
  }
});

// 显示预览模式切换提示
function showPreviewModeHint() {
  if (!isMdMode) return;
  
  // 移除之前的闪烁
  toggleMdBtn.classList.remove('flash');
  
  // 添加闪烁效果
  toggleMdBtn.classList.add('flash');
  modeHint.textContent = '请点击左侧图片切换至编辑模式';
  unlockPopup.style.display = 'block';
  
  // 3秒后自动隐藏
  setTimeout(() => {
    hidePreviewModeHint();
  }, 3000);
}

function hidePreviewModeHint() {
  toggleMdBtn.classList.remove('flash');
  unlockPopup.style.display = 'none';
}

// 切换到编辑模式
function switchToEditMode() {
  isMdMode = false;
  toggleMdBtn.classList.remove('active');
  mdSource.style.display = 'block';
  contentPreview.style.display = 'none';
  mdSource.focus();
  hidePreviewModeHint();
}

// toggleMdBtn 双击事件（预览模式下）
toggleMdBtn.addEventListener('dblclick', (e) => {
  if (!isMdMode) return;
  
  e.preventDefault();
  switchToEditMode();
});

// 预览窗口双击事件
contentPreview.addEventListener('dblclick', (e) => {
  if (!isMdMode) return;
  
  // 读取设置
  const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
  
  if (settings.dblclickEdit !== false) {
    // 开启双击切换功能，直接切换到编辑模式
    switchToEditMode();
  } else {
    // 未开启，显示提示
    showPreviewModeHint();
  }
});

// 提示气泡双击
modeHint.addEventListener('dblclick', () => {
  switchToEditMode();
});

// 点击其他地方隐藏提示
document.addEventListener('click', (e) => {
  if (unlockPopup.style.display === 'block') {
    if (!toggleMdBtn.contains(e.target) && !unlockPopup.contains(e.target)) {
      hidePreviewModeHint();
    }
  }
});

// 菜单按钮
menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  menuDropdown.classList.toggle('show');
});

document.addEventListener('click', (e) => {
  if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
    menuDropdown.classList.remove('show');
  }
});

// 设置
settingsItem.addEventListener('click', () => {
  const settingsUrl = chrome.runtime.getURL('src/pages/settings.html');
  chrome.tabs.create({ url: settingsUrl });
  menuDropdown.classList.remove('show');
});

// 配置 IMA API
configImaItem.addEventListener('click', () => {
  const creds = getImaCredentials();
  clientIdInput.value = creds.clientId;
  apiKeyInput.value = creds.apiKey;
  apiModal.classList.add('show');
  menuDropdown.classList.remove('show');
});

// 刷新知识库
refreshKbItem.addEventListener('click', () => {
  fetchKnowledgeBases();
  menuDropdown.classList.remove('show');
  showSaveNotification('知识库已刷新');
});

// 关闭模态框
function closeApiModal() {
  apiModal.classList.remove('show');
}

closeModalBtn.addEventListener('click', closeApiModal);
cancelApiBtn.addEventListener('click', closeApiModal);

apiModal.addEventListener('click', (e) => {
  if (e.target === apiModal) {
    closeApiModal();
  }
});

// 保存 API 配置
saveApiBtn.addEventListener('click', () => {
  const clientId = clientIdInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  
  if (!clientId || !apiKey) {
    showCustomAlert('请填写完整的 API 信息');
    return;
  }
  
  localStorage.setItem('imaClientId', clientId);
  localStorage.setItem('imaApiKey', apiKey);
  
  showSaveNotification('API 配置已保存');
  closeApiModal();
  
  // 刷新知识库列表
  fetchKnowledgeBases();
});

// 关于作者
aboutAuthorItem.addEventListener('click', () => {
  authorModal.classList.add('show');
  menuDropdown.classList.remove('show');
});

function closeAuthorModal() {
  authorModal.classList.remove('show');
}

closeAuthorModalBtn.addEventListener('click', closeAuthorModal);
closeAuthorBtn.addEventListener('click', closeAuthorModal);

authorModal.addEventListener('click', (e) => {
  if (e.target === authorModal) {
    closeAuthorModal();
  }
});

// 自定义提示
function showCustomAlert(message) {
  customAlert.textContent = message;
  customAlert.style.display = 'flex';
  customAlert.style.animation = 'notificationSlideIn 0.3s ease-out';
  
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

// 清空按钮
clearContentBtn.addEventListener('click', () => {
  mdSource.value = '';
  localStorage.removeItem('draftMdSource');
  contentPreview.innerHTML = '';
  updateSaveButtonState();
  showSaveNotification('内容已清空');
});

// 一键配置功能
quickConfigBtn.addEventListener('click', () => {
  apiModal.classList.remove('show');
  quickConfigModal.classList.add('show');
  credentialInput.value = '';
});

closeQuickConfigBtn.addEventListener('click', () => {
  quickConfigModal.classList.remove('show');
});

quickConfigModal.addEventListener('click', (e) => {
  if (e.target === quickConfigModal) {
    quickConfigModal.classList.remove('show');
  }
});

// 获取凭证按钮
getCredentialBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://ima.qq.com/agent-interface' });
});

// 应用按钮
applyQuickConfigBtn.addEventListener('click', () => {
  const input = credentialInput.value.trim();
  
  if (!input) {
    showCustomAlert('请输入凭证信息');
    return;
  }
  
  // 解析凭证
  const apiKeyMatch = input.match(/API\s*Key[:\s]*(.+)/i);
  const clientIdMatch = input.match(/Client\s*ID[:\s]*(.+)/i);
  
  if (!apiKeyMatch || !clientIdMatch) {
    showCustomAlert('格式错误，请按照示例格式粘贴');
    return;
  }
  
  const extractedApiKey = apiKeyMatch[1].trim();
  const extractedClientId = clientIdMatch[1].trim();
  
  // 填入表单
  apiKeyInput.value = extractedApiKey;
  clientIdInput.value = extractedClientId;
  
  // 保存到 localStorage
  localStorage.setItem('imaClientId', extractedClientId);
  localStorage.setItem('imaApiKey', extractedApiKey);
  
  // 关闭一键配置弹窗
  quickConfigModal.classList.remove('show');
  showSaveNotification('配置已应用');
  
  // 刷新知识库列表
  fetchKnowledgeBases();
});
