## Context

该扩展通过 popup、后台 service worker 和 `chrome.*` API 清理当前标签页相关的 Cookie、本地存储、浏览历史、缓存和隐私数据。现有实现中，历史清理会从当前 hostname 自动推导父域候选，第三方 Cookie 清理会扫描并删除所有不属于当前站点的 Cookie；这些行为对用户来说不够可预期。

扩展还存在两个运行环境问题：内容设置面板依赖 `chrome.contentSettings` 但 manifest 未声明权限；popup 依赖 CDN Font Awesome，可能被扩展 CSP、离线环境或审核规则阻断。

## Goals / Non-Goals

**Goals:**

- 清理行为必须以明确、可解释的域名范围为边界。
- 删除全局浏览器数据的操作必须在 UI 和确认流程中显式表达其范围。
- manifest 权限必须覆盖实际使用的 Chrome API。
- popup 不依赖远程运行时资源。
- 核心匹配逻辑具备可重复验证的测试或检查脚本。

**Non-Goals:**

- 不引入完整公共后缀解析依赖，除非后续明确需要“父站点”级别清理。
- 不改变扩展的整体信息架构。
- 不实现浏览器无法可靠支持的“当前站点实际使用过的第三方 Cookie”追踪。

## Decisions

### 1. 域名候选改为精确 hostname 优先

`getDomainCandidates()` 不再自动生成 `parts.slice(-2)` 或 `parts.slice(-3)` 形式的父域候选。历史清理使用当前 hostname 作为唯一基础范围；当用户勾选包含子域名时，仅匹配该 hostname 的子域。

替代方案是引入 Public Suffix List 来推导 eTLD+1。当前不采用，因为该功能的主要风险来自误删，保守匹配比智能推导更安全。

### 2. 第三方 Cookie 操作不伪装成当前站点清理

Chrome cookies API 能读取 Cookie 的域名，但不能可靠证明某个 Cookie 是当前页面上下文中的第三方 Cookie。实现必须二选一：

- 将现有操作改名为全局“其他站点 Cookie 清理”，增加危险确认。
- 或隐藏该入口，只保留当前站点 Cookie 清理。

默认推荐隐藏或禁用该入口，除非产品明确选择提供全局 Cookie 管理能力。

### 3. 权限与 API 使用保持一致

如果保留内容设置面板，manifest 必须声明 `"contentSettings"`。权限增加应在 PR 中明确说明原因，因为这会改变扩展安装/审核面。

### 4. 远程图标资源改为本地资源

popup 不再加载 `https://cdnjs.cloudflare.com/...`。实现采用 vendoring Font Awesome 必需文件，保持现有 `fa-*` class 不变，降低 UI 改动风险。

## Risks / Trade-offs

- 父域不再自动推导 → 用户在子域页面清理父域历史时需要更明确的入口。缓解：后续可增加“清理父站点”显式选项。
- 隐藏第三方 Cookie 清理会减少功能表面积 → 换来更少误删风险。缓解：若保留，则必须改名和二次确认。
- 增加 `contentSettings` 权限可能影响审核 → 缓解：只在功能保留时添加，并在文档中说明用途。
- 本地化 Font Awesome 会增加仓库文件 → 缓解：只引入必要资源，或替换为已有本地图标。

## Migration Plan

1. 修改域名匹配逻辑并补验证用例。
2. 选择并实现第三方 Cookie 入口策略。
3. 同步 manifest 权限和 popup 资源。
4. 手动加载 unpacked extension，验证 popup、清理、权限面板和历史清理行为。

回滚时可恢复旧 UI，但不建议恢复父域猜测逻辑。

## Open Questions

- 第三方 Cookie 功能最终是隐藏，还是改造成明确的全局危险操作？
- 是否需要新增一个“清理父站点”显式入口，以满足用户确实想清理 `example.co.uk` 的场景？
