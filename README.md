# IMA笔记 浏览器插件

一个用于快速选取网页内容并保存到 IMA 知识库的浏览器插件。

## 功能特性

- **内容选取**：精准选取网页中的文本和图片内容
- **全文获取**：一键获取当前网页的全部文本内容
- **Markdown 支持**：支持 Markdown 源码编辑和实时预览
- **图片处理**：自动提取图片链接，最多支持9张图片
- **IMA 集成**：直接保存内容到 IMA 知识库
- **设置管理**：支持多种个性化设置选项

## 安装方法

### Chrome 浏览器
1. 打开 Chrome 浏览器，进入扩展管理页面（chrome://extensions/）
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目的 `browser_plugin` 目录
5. 扩展安装完成后，在浏览器右上角可以看到插件图标

### Edge 浏览器
1. 打开 Edge 浏览器，进入扩展管理页面（edge://extensions/）
2. 开启左侧的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目的 `browser_plugin` 目录
5. 扩展安装完成后，在浏览器右上角可以看到插件图标

## 使用方法

### 1. 配置 IMA API
1. 点击插件图标，打开侧边栏
2. 点击右上角的菜单按钮（☰）
3. 选择「设置」或「IMA 配置」
4. 输入你的 IMA Client ID 和 API Key
   - 获取方式：打开 [ima.qq.com/agent-interface](https://ima.qq.com/agent-interface) 获取

### 2. 选取内容
1. 在任何一个网页使用浏览器插件
2. 点击「选 取」按钮
3. 鼠标会变成十字形状，移动到你想要选取的内容上
4. 绿色虚线框待选中，点击确认后变成绿色区域
5. 按下回车↩︎完成选取
6. 选取的内容会显示在侧边栏中

### 3. 获取全文
1. 在侧边栏中点击「全 文」按钮
2. 插件会自动获取当前网页的全部文本内容
3. 内容会显示在侧边栏中

### 4. Markdown 编辑和预览
1. 在编辑模式下直接输入 Markdown 格式内容
2. 点击左下角的图标可以切换到预览模式
3. 在预览模式下双击可以快速切换回编辑模式
4. 支持完整的 Markdown 语法渲染

### 5. 保存到 IMA 知识库
1. 选择知识库（首次使用需要在 IMA 平台创建）
2. 确认侧边栏中显示的内容无误
3. 点击底部的「保 存」按钮
4. 保存成功后会显示通知
5. 内容会自动保存到你的 IMA 知识库中

## 设置选项

在设置页面中可以配置以下选项：

- **选取后自动进入预览模式**：当内容为空时，选取确认后自动切换到预览模式
- **自动保存草稿**：自动保存输入内容到本地缓存
- **双击切换至编辑状态**：在预览模式下双击内容切换到编辑模式

## 插件地址

**GitHub 仓库：** [https://github.com/RougeWhite/flomo-cut](https://github.com/RougeWhite/flomo-cut)

## 技术实现

- **前端框架**：原生 JavaScript + CSS
- **Markdown 渲染**：marked.js
- **浏览器扩展 API**：Chrome Extension Manifest V3
- **存储方式**：localStorage（用于存储 API Key 和设置）
- **网络请求**：Fetch API（用于与 IMA API 通信）
- **内容选取**：DOM 操作 + 事件监听

## 项目结构

```
browser_plugin/
├── background.js         # 后台脚本
├── content.js           # 内容脚本（处理网页选取）
├── content.css          # 内容脚本样式
├── sidebar.html         # 侧边栏页面
├── sidebar.js          # 侧边栏脚本
├── sidebar.css          # 侧边栏样式
├── settings.html        # 设置页面
├── settings.js          # 设置页面脚本
├── marked.min.js        # Markdown 解析库
├── manifest.json        # 扩展配置文件
├── author.jpg           # 作者头像
├── wx.jpg              # 微信收款码
├── zfb.jpg             # 支付宝收款码
├── icon16.png          # 插件图标
├── icon48.png          # 插件图标
├── icon128.png         # 插件图标
├── 选取.svg            # 选取按钮图标
├── 全文.svg            # 全文按钮图标
└── README.md           # 项目说明文档
```

## 注意事项

1. **API Key 安全**：API Key 仅存储在本地，不会上传到任何服务器
2. **图片限制**：最多支持处理9张图片，超过9张的图片将不会被处理
3. **知识库配置**：首次使用需要在 IMA 平台创建知识库
4. **内容安全**：某些网站可能会设置安全策略，阻止插件获取内容

## 更新日志

### v1.0.1
- 新增 Markdown 编辑和预览功能
- 新增设置页面，支持个性化配置
- 新增关于页面和作者支持信息
- 优化选取模式交互体验

### v1.0.0
- 初始版本发布
- 实现基本的内容选取和全文获取功能
- 支持图片处理
- 集成 IMA API
- 优化用户界面和交互体验

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 许可证

MIT License

## 作者

- **white**
- **GitHub**：[https://github.com/RougeWhite/flomo-cut](https://github.com/RougeWhite/flomo-cut)

---

**感谢使用 IMA笔记 插件！希望它能帮助你更高效地收集和整理信息。**
