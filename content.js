// 内容脚本 - 处理网页内容选取

let isSelectionMode = false;
let selectedElements = [];
let topBar = null;
let confirmBtn = null;
let hoveredElement = null;

// 监听来自侧边栏的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startSelection':
      startSelectionMode();
      break;
    case 'getFullText':
      sendFullText();
      break;
  }
});

// 开始选取模式
function startSelectionMode() {
  // 如果已经在选取模式，先退出
  if (isSelectionMode) {
    exitSelectionMode();
  }
  
  isSelectionMode = true;
  selectedElements = [];
  
  // 创建顶部提示框
  createTopBar();
  
  // 添加事件监听
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleElementClick);
  document.addEventListener('keydown', handleKeyDown);
  
  // 添加全局点击事件阻止，确保可交互元素不触发默认行为
  addGlobalClickBlocker();
  
  // 改变鼠标样式
  document.body.style.cursor = 'crosshair';
  
  // 添加选取模式类，用于CSS样式控制
  document.body.classList.add('selection-mode');
}

// 退出选取模式
function exitSelectionMode() {
  isSelectionMode = false;
  
  // 移除顶部提示框
  if (topBar && topBar.parentNode) {
    topBar.parentNode.removeChild(topBar);
    topBar = null;
  }
  
  // 移除所有选中元素的样式
  selectedElements.forEach(element => {
    element.classList.remove('selected-element');
  });
  selectedElements = [];
  
  // 移除鼠标悬停元素的样式
  if (hoveredElement) {
    hoveredElement.classList.remove('hover-element');
    hoveredElement = null;
  }
  
  // 移除事件监听
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleElementClick);
  document.removeEventListener('keydown', handleKeyDown);
  
  // 移除全局点击事件阻止
  removeGlobalClickBlocker();
  
  // 恢复鼠标样式
  document.body.style.cursor = 'default';
  
  // 移除选取模式类
  document.body.classList.remove('selection-mode');
  
  confirmBtn = null;
}

// 创建顶部提示框
function createTopBar() {
  topBar = document.createElement('div');
  topBar.className = 'selection-top-bar';
  topBar.innerHTML = `
    <span>点击区域选中，再次点击取消选中，ESC 取消，↩︎ 完成</span>
    <button class="confirm-selection-btn" style="display: none;">确认选取 (0)</button>
  `;
  document.body.appendChild(topBar);
  
  confirmBtn = topBar.querySelector('.confirm-selection-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleConfirmSelection);
  }
}

// 更新顶部提示框的确认按钮
function updateConfirmButton() {
  if (!confirmBtn) return;
  
  const count = selectedElements.length;
  if (count > 0) {
    confirmBtn.style.display = 'flex';
    confirmBtn.textContent = `确认选取 (${count})`;
  } else {
    confirmBtn.style.display = 'none';
  }
}

// 处理鼠标移动事件
function handleMouseMove(e) {
  e.preventDefault();
  
  // 跳过顶部提示框
  if (e.target.closest('.selection-top-bar')) {
    return;
  }
  
  // 移除之前悬停元素的样式
  if (hoveredElement && !selectedElements.includes(hoveredElement)) {
    hoveredElement.classList.remove('hover-element');
    hoveredElement = null;
  }
  
  // 为当前元素添加悬停样式
  const currentElement = e.target;
  if (currentElement && !selectedElements.includes(currentElement)) {
    currentElement.classList.add('hover-element');
    hoveredElement = currentElement;
  }
}

// 处理元素点击事件
function handleElementClick(e) {
  // 阻止所有默认行为和事件传播，确保在选取模式下不触发任何交互
  e.preventDefault();
  e.stopPropagation();
  
  // 跳过顶部提示框
  if (e.target.closest('.selection-top-bar')) {
    return;
  }
  
  const clickedElement = e.target;
  const isAlreadySelected = selectedElements.includes(clickedElement);
  
  if (isAlreadySelected) {
    // 如果已经选中，取消选择
    clickedElement.classList.remove('selected-element');
    selectedElements = selectedElements.filter(element => element !== clickedElement);
  } else {
    // 如果未选中，添加到选中列表
    clickedElement.classList.add('selected-element');
    if (hoveredElement === clickedElement) {
      clickedElement.classList.remove('hover-element');
      hoveredElement = null;
    }
    selectedElements.push(clickedElement);
  }
  
  // 更新确认按钮
  updateConfirmButton();
}

// 全局点击事件阻止器函数
function globalClickBlocker(e) {
  if (isSelectionMode && !e.target.closest('.selection-top-bar')) {
    e.preventDefault(); // 只阻止默认行为，不阻止事件传播
  }
}

// 添加全局点击事件阻止，确保可交互元素不触发默认行为
function addGlobalClickBlocker() {
  document.addEventListener('click', globalClickBlocker, true); // 使用捕获阶段，确保先于元素自身事件触发
}

// 移除全局点击事件阻止
function removeGlobalClickBlocker() {
  document.removeEventListener('click', globalClickBlocker, true);
}

// 处理键盘事件
function handleKeyDown(e) {
  if (e.key === 'Escape') {
    // ESC 键：取消并退出选取模式
    exitSelectionMode();
  } else if (e.key === 'Enter') {
    // Enter 键：如果有选中元素，确认选取；否则退出选取模式
    if (selectedElements.length > 0) {
      handleConfirmSelection();
    } else {
      exitSelectionMode();
    }
  }
}

// 处理确认选取事件
async function handleConfirmSelection() {
  if (selectedElements.length === 0) {
    exitSelectionMode();
    return;
  }
  
  try {
    // 收集所有图片 URL，最多 9 张
    let allImages = [];
    
    // 为每个选中元素获取文本内容和图片链接
    const selections = selectedElements.map(element => {
      let content = element.textContent.trim();
      
      // 提取元素中的图片链接
      const images = extractImages(element);
      if (images.length > 0) {
        // 只添加未超过 9 张的图片
        images.forEach(imgUrl => {
          if (allImages.length < 9) {
            allImages.push(imgUrl);
            // 以图片形式展示，而不是标记
            content += `\n<img src="${imgUrl}" style="max-width: 100%; height: auto; margin: 8px 0; border-radius: 4px;">`;
          }
        });
      }
      
      return {
        screenshot: null, // 始终为 null，不生成截图
        textContent: content,
        element
      };
    });
    
    // 获取当前网页的title和url
    const pageInfo = {
      title: document.title,
      url: window.location.href
    };
    
    // 始终发送selections格式，确保sidebar能正确处理
    chrome.runtime.sendMessage({ 
      action: 'selectionComplete', 
      selections, 
      pageInfo,
      image_urls: allImages // 添加图片 URL 数组
    });
    
  } catch (error) {
    console.error('处理失败:', error);
    
    // 即使出错，也要发送selections格式
    const fallbackSelections = selectedElements.map(element => ({
      screenshot: null,
      textContent: element.textContent.trim(),
      element
    }));
    
    chrome.runtime.sendMessage({ 
      action: 'selectionComplete', 
      selections: fallbackSelections,
      pageInfo: {
        title: document.title,
        url: window.location.href
      } 
    });
  } finally {
    // 退出选取模式
    exitSelectionMode();
  }
}

// 截图功能已移除

// 提取元素中的图片
function extractImages(element) {
  const images = [];
  
  // 如果当前元素本身就是图片，直接添加它的src
  if (element.tagName.toLowerCase() === 'img') {
    images.push(element.src);
  } else {
    // 否则查找元素内的所有图片
    const imgElements = element.querySelectorAll('img');
    imgElements.forEach(img => {
      images.push(img.src);
    });
  }
  
  return images;
}

// 发送全文到侧边栏
function sendFullText() {
  // 获取纯文本内容
  let content = document.body.innerText;
  
  // 收集所有图片 URL，最多 9 张
  let allImages = [];
  const imgElements = document.querySelectorAll('img');
  
  imgElements.forEach(img => {
    if (allImages.length < 9) {
      allImages.push(img.src);
    }
  });
  
  // 构建图片 HTML
  let imagesHtml = '';
  if (allImages.length > 0) {
    imagesHtml = '\n\n图片：';
    allImages.forEach(imgUrl => {
      imagesHtml += `\n<img src="${imgUrl}" style="max-width: 100%; height: auto; margin: 8px 0; border-radius: 4px;">`;
    });
  }
  
  // 发送消息，将图片 HTML 作为单独字段发送
  chrome.runtime.sendMessage({ 
    action: 'fullTextReceived', 
    content: content,
    imagesHtml: imagesHtml,
    pageInfo: {
      title: document.title,
      url: window.location.href
    },
    image_urls: allImages // 添加图片 URL 数组
  });
}

// 清理函数，确保在页面卸载时移除所有事件监听和元素
window.addEventListener('beforeunload', () => {
  exitSelectionMode();
});