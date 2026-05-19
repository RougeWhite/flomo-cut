// 设置页面逻辑

const navItems = document.querySelectorAll('.settings-nav-item');
const sections = document.querySelectorAll('.settings-section');

// 加载保存的设置
function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
  
  // 默认值设置
  document.getElementById('auto-preview').checked = settings.autoPreview !== false; // 默认开启
  document.getElementById('save-draft').checked = settings.saveDraft !== false; // 默认开启
  document.getElementById('dblclick-edit').checked = settings.dblclickEdit === true; // 默认关闭
  
  // 加载 IMA 配置
  document.getElementById('client-id').value = localStorage.getItem('imaClientId') || '';
  document.getElementById('api-key').value = localStorage.getItem('imaApiKey') || '';
}

// 保存常规设置
function saveSettings() {
  const settings = {
    autoPreview: document.getElementById('auto-preview').checked,
    saveDraft: document.getElementById('save-draft').checked,
    dblclickEdit: document.getElementById('dblclick-edit').checked
  };
  localStorage.setItem('appSettings', JSON.stringify(settings));
  showNotification('设置已保存');
}

// 保存 IMA 配置
function saveImaConfig() {
  const clientId = document.getElementById('client-id').value.trim();
  const apiKey = document.getElementById('api-key').value.trim();
  
  if (!clientId || !apiKey) {
    showNotification('请填写完整的 API 信息');
    return;
  }
  
  localStorage.setItem('imaClientId', clientId);
  localStorage.setItem('imaApiKey', apiKey);
  showNotification('IMA 配置已保存');
}

// 显示通知
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'save-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transition = 'all 0.3s ease-out';
    notification.style.transform = 'translateX(-100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

// 菜单切换
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const sectionId = item.dataset.section;
    
    // 移除所有 active 类
    navItems.forEach(nav => nav.classList.remove('active'));
    sections.forEach(sec => sec.classList.remove('active'));
    
    // 添加 active 类
    item.classList.add('active');
    document.getElementById(`section-${sectionId}`).classList.add('active');
  });
});

// 保存常规设置按钮
document.getElementById('save-settings').addEventListener('click', () => {
  saveSettings();
});

// 保存 IMA 配置按钮
document.getElementById('save-ima-config').addEventListener('click', () => {
  saveImaConfig();
});

// 关闭按钮
document.getElementById('close-settings').addEventListener('click', () => {
  window.close();
});

// 页面加载时加载设置
window.addEventListener('load', () => {
  loadSettings();
});
