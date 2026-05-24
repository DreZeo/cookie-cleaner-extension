## Why

当前扩展包含多个会删除浏览器数据的能力，但部分清理范围依赖域名猜测或文案含义不清，可能导致用户误删非目标站点的浏览历史或 Cookie。这个变更用于收窄危险操作边界，并修复会影响扩展运行和审核的权限、远程资源问题。

## What Changes

- 收窄历史记录清理的域名匹配规则：不再根据 hostname 自动推导父域，例如不再从 `shop.example.co.uk` 推导出 `co.uk`。
- 调整“第三方 Cookie 清理”的产品语义：避免把全浏览器范围的 Cookie 删除伪装成当前站点清理。
- 修复内容设置功能所需的 manifest 权限声明，确保 `chrome.contentSettings` 相关 UI 可用。
- 移除 popup 对 CDN Font Awesome 的运行时依赖，改为本地资源。
- 为核心匹配与分类逻辑补充可验证用例，覆盖公共后缀、子域、白名单和清理范围。

## Capabilities

### New Capabilities

- `extension-cleanup-safety`: 定义扩展执行历史、Cookie、权限和隐私数据清理时的范围边界、确认要求和资源约束。

### Modified Capabilities

- 无。

## Impact

- 影响文件：`scripts/domain-utils.js`、`background.js`、`scripts/history.js`、`scripts/cookies.js`、`scripts/cleanup-actions.js`、`popup.html`、`manifest.json`。
- 可能影响 UI 文案和用户操作流程，尤其是第三方 Cookie 清理入口。
- 可能新增本地 vendor 资源或替换图标实现。
- 需要新增或整理测试入口；当前仓库没有自动化测试配置。
