# 缓存清除器 Pro

<p align="center">
  <img src="./icons/icon128.png" alt="缓存清除器 Pro 图标" width="96" />
</p>

<p align="center">
  面向 Chromium 浏览器的 Manifest V3 站点清理扩展，支持当前站点数据清理、浏览记录清理、权限管理、保护列表、资料清理和无痕退出。
</p>

## 功能亮点

- 当前站点清理：Cookie、LocalStorage、SessionStorage、IndexedDB、Cache Storage、Service Worker 和浏览器缓存。
- 浏览记录清理：按当前域名和时间范围扫描、清理，并在清理后复扫确认结果。
- 权限与保护：按站点请求/撤销 Cookie 访问授权，支持站点保护列表防止误清理。
- 资料清理：清除浏览器自动填充数据和保存密码，并明确提示此类 API 不返回扫描数量。
- 无痕退出：清理当前站点数据、浏览记录与授权后，关闭被清理的网页标签页。
- 离线可用：Font Awesome CSS 与字体已 vendored 到 `vendor/fontawesome/`，popup 不依赖 CDN。
- 双语与主题：支持中文/English 切换，支持深浅主题并持久化保存。

## 界面模块

| Tab | 说明 |
| --- | --- |
| 清理 | 展示当前站点各类存储状态，支持单项清理和一键清理 |
| 记录 | 扫描/清理当前域名浏览记录，查看清理日志并按结果筛选 |
| 权限 | 管理当前站点授权、站点保护列表、子域名范围和自动刷新 |
| 资料 | 全浏览器资料清理、无痕退出和高风险操作确认 |

## 近期更新

- 历史扫描性能优化：移除空字符串查询，不再每次扫描拉取全量浏览记录，popup 加载更流畅。
- 代码质量改进：清理死代码、补全 `formatBytes` 边界保护、提取 `history-api.js` 共享模块消除重复定义、内容设置增加值校验。
- 清理页改为紧凑列表 UI，减少卡片式展示感。
- 浏览记录清理加入结构化结果、截断提示、失败计数和清理后复扫。
- 资料页清理加入不可验证声明、结构化日志和更明确的高风险确认。
- "访客模式"更名为"无痕退出"，完成后关闭被清理网页标签页。
- 后台消息入口增加发送方校验和消息类型白名单。
- partial 加载增加本地片段白名单和结构校验。
- Font Awesome 资源本地化，移除 popup 对远程 CDN 的依赖。

## 快速开始

1. 打开扩展管理页：
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. 开启"开发者模式"。
3. 点击"加载已解压的扩展程序"，选择本项目根目录。
4. 修改代码后，在扩展管理页点击"刷新"。

## 开发与测试

本项目无构建步骤，直接作为未打包扩展加载。自动化测试使用 Node.js 内置测试框架。

```powershell
npm test
node --check background.js
node --check scripts/main.js
```

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `cookies` | 读取、分类和删除 Cookie |
| `activeTab` | 获取当前活动标签页上下文 |
| `browsingData` | 清除浏览器缓存、表单数据和保存密码 |
| `storage` | 保存主题、语言、Tab 状态、白名单和清理日志 |
| `scripting` | 注入脚本扫描/清理当前站点存储 |
| `history` | 扫描与删除浏览记录 |
| `contentSettings` | 管理当前站点内容设置 |
| `optional_host_permissions` | 按站点请求或撤销主机访问权限 |

## 兼容性与限制

- 支持 Chrome、Edge 等 Chromium 内核浏览器，要求 Manifest V3。
- `chrome://`、`edge://`、扩展页等受限页面无法注入脚本或执行站点清理。
- 浏览记录扫描受 `HISTORY_MAX_RESULTS = 5000` 限制；达到上限时 UI 会提示统计可能不完整。
- 自动填充数据和保存密码只能按时间范围全浏览器清理，浏览器 API 不提供数量扫描或复扫验证。
- 存储大小为估算值，适合判断趋势，不等同于浏览器精确占用。

## 项目结构

```text
.
├─ manifest.json              # MV3 权限、popup、background 配置
├─ popup.html                 # popup 外壳，动态加载 partials
├─ background.js              # 后台历史、白名单、日志消息处理
├─ partials/                  # 清理、记录、权限、资料等 UI 片段
├─ scripts/                   # ES modules 业务逻辑与纯函数模型（含 history-api.js 共享封装）
├─ styles/                    # 分模块 CSS
├─ test/                      # node --test 单元测试
├─ icons/                     # 扩展图标
├─ images/                    # README 截图
└─ vendor/fontawesome/        # 本地 Font Awesome CSS 与 webfonts
```

## 截图

| 清理 Tab（浅色，上半） | 清理 Tab（浅色，下半） |
| --- | --- |
| ![清理 Tab（浅色，上半）](./images/01.png) | ![清理 Tab（浅色，下半）](./images/1.5.png) |

| 记录 Tab（浅色） | 权限与保护列表（浅色） |
| --- | --- |
| ![记录 Tab（浅色）](./images/02.png) | ![权限与保护列表（浅色）](./images/3.5.png) |

## 常见问题

**为什么 Cookie 数量显示为 `-`？**  
当前站点可能尚未授权。到"权限"Tab 授权后再扫描或清理。

**为什么资料页不显示自动填充或密码数量？**  
浏览器扩展 API 不允许读取这些数据的数量或内容。扩展只能打开浏览器设置页供人工查看，并提交清除请求。

**为什么历史记录显示 `5000+` 或提示可能不完整？**  
浏览器历史搜索有最大结果限制。达到上限时，扩展会继续清理已匹配项，但不会承诺统计完整。

## 版本

当前版本：`2.0`
