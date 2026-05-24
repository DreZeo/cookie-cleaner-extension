## 1. 域名匹配与历史清理

- [x] 1.1 修改 `scripts/domain-utils.js`，移除基于最后两段或三段 hostname 的父域候选推导
- [x] 1.2 确认 `background.js` 和 `scripts/history.js` 使用新的明确域名候选行为
- [x] 1.3 增加或整理可运行验证，覆盖 `shop.example.co.uk` 不匹配 `co.uk`、`example.com` 不匹配 `another-example.com`

## 2. Cookie 清理范围

- [x] 2.1 决定第三方 Cookie 入口策略：隐藏入口，或改为明确的全局/跨站点危险操作
- [x] 2.2 若保留全局 Cookie 操作，更新 UI 文案和二次确认流程，明确会影响当前站点之外的数据
- [x] 2.3 验证当前站点 Cookie 清理只删除目标域名范围内 Cookie
- [x] 2.4 验证全局或跨站点 Cookie 操作会跳过白名单保护域名

## 3. 权限与资源

- [x] 3.1 若保留内容设置面板，在 `manifest.json` 中添加 `contentSettings` 权限
- [x] 3.2 若不添加 `contentSettings` 权限，隐藏或禁用内容设置相关 UI
- [x] 3.3 移除 `popup.html` 中的 CDN Font Awesome 引用
- [x] 3.4 使用本地 vendor Font Awesome 资源替换 popup 所需图标

## 4. 验证与文档

- [x] 4.1 手动加载 unpacked extension，验证 popup 在离线或阻断 CDN 时仍正常显示
- [x] 4.2 手动验证权限面板、白名单拦截、历史清理、Cookie 清理和访客模式的关键路径
- [x] 4.3 更新贡献或开发文档中的手动测试说明，如有新增测试命令则同步记录
