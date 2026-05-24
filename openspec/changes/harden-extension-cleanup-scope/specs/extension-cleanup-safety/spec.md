## ADDED Requirements

### Requirement: 历史清理必须使用明确域名范围
扩展 SHALL 只清理与当前明确目标 hostname 匹配的浏览历史。系统 MUST NOT 通过截取最后两段或三段域名自动推导父域。

#### Scenario: 公共后缀域名不会被扩大匹配
- **WHEN** 当前站点为 `shop.example.co.uk` 且用户执行历史清理
- **THEN** 系统 MUST NOT 将清理范围扩大到 `co.uk` 或所有 `*.co.uk` 历史记录

#### Scenario: 包含子域名只匹配目标 hostname 的子域
- **WHEN** 当前目标为 `example.com` 且用户启用包含子域名
- **THEN** 系统 SHALL 匹配 `example.com` 和 `*.example.com`
- **THEN** 系统 MUST NOT 匹配 `another-example.com`

### Requirement: Cookie 清理范围必须对用户可见
扩展 SHALL 在执行 Cookie 删除前让用户能理解删除范围。任何会影响当前站点之外 Cookie 的操作 MUST 在 UI 文案和确认流程中标明其全局范围。

#### Scenario: 当前站点 Cookie 清理不会删除其他站点
- **WHEN** 用户选择清理当前站点 Cookie
- **THEN** 系统 SHALL 只删除与当前目标域名匹配的 Cookie
- **THEN** 系统 MUST NOT 删除不属于当前目标域名的 Cookie

#### Scenario: 全局 Cookie 清理需要显式标识
- **WHEN** 某个操作会删除当前站点之外的 Cookie
- **THEN** UI MUST 将该操作标识为全局或跨站点操作
- **THEN** 系统 MUST 要求用户完成额外确认后再执行

### Requirement: 白名单必须保护匹配域名的数据
扩展 SHALL 在危险清理操作前检查白名单。被白名单保护的域名及其配置范围内的子域数据 MUST NOT 被普通清理操作删除。

#### Scenario: 白名单阻止当前站点清理
- **WHEN** 当前站点命中白名单规则
- **THEN** 系统 SHALL 阻止当前站点清理操作
- **THEN** 系统 SHALL 向用户显示被白名单拦截的提示

#### Scenario: 全局 Cookie 操作跳过白名单域名
- **WHEN** 用户执行全局或跨站点 Cookie 清理
- **THEN** 系统 MUST 保留命中白名单规则的 Cookie

### Requirement: 扩展权限必须覆盖实际使用的 API
扩展 manifest SHALL 声明运行时会直接使用的 Chrome extension API 权限。

#### Scenario: 内容设置面板可用
- **WHEN** 扩展保留内容设置读写功能
- **THEN** manifest MUST 声明 `contentSettings` 权限

#### Scenario: 未声明权限时隐藏功能
- **WHEN** manifest 不声明某项功能所需权限
- **THEN** 系统 MUST 隐藏或禁用依赖该权限的入口

### Requirement: Popup 不依赖远程运行时资源
扩展 popup SHALL 只加载扩展包内资源或浏览器允许的内置资源。popup MUST NOT 在运行时依赖 CDN 样式、字体或脚本。

#### Scenario: 离线环境可打开 popup
- **WHEN** 浏览器无法访问公网 CDN
- **THEN** popup SHALL 正常渲染主要 UI 和操作入口

#### Scenario: 扩展页面不加载远程字体样式
- **WHEN** popup 页面加载
- **THEN** 页面 MUST NOT 请求 `cdnjs` 或其他远程图标字体资源
