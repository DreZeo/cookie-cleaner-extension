# history-scan Specification

## Purpose
TBD - created by archiving change fix-history-scan-empty-query. Update Purpose after archive.
## Requirements
### Requirement: 查询文本不得包含空字符串

历史扫描构造 `chrome.history.search` 查询时，`queryTexts` 数组 MUST NOT 包含空字符串 `''`。

**理由**：`chrome.history.search({ text: '' })` 会返回全量浏览记录（上限 `HISTORY_MAX_RESULTS`），造成不必要的性能开销。

#### Scenario: 构造查询时不包含空字符串
- **WHEN** 调用 `getHistoryItems` 或 `getHistoryItemsFromPopup` 扫描某域名的历史记录
- **THEN** 传给 `chrome.history.search` 的 `queryTexts` 数组中 MUST NOT 包含空字符串 `''`

### Requirement: 查询文本来源于域名候选列表

`queryTexts` MUST 由 `getDomainCandidates(domain)` 的返回值派生，仅包含非空字符串。

#### Scenario: 查询文本来自域名候选
- **WHEN** `getDomainCandidates('example.com')` 返回 `['example.com']`
- **THEN** `queryTexts` SHALL 仅包含 `'example.com'`，不含其他冗余项

### Requirement: 保留客户端精确过滤

查询返回的结果 MUST 经过 `filterHistoryItems(items, candidates, includeSubdomains)` 过滤，保证域名匹配精确性。

**理由**：`chrome.history.search` 的 `text` 参数是子串匹配，会匹配 URL 和 title 中任意位置包含该文本的记录。`filterHistoryItems` 负责剔除这类误匹配。

#### Scenario: 子串误匹配被过滤掉
- **WHEN** `chrome.history.search({ text: 'example.com' })` 返回包含 `https://notexample.com/page` 的记录
- **THEN** `filterHistoryItems` MUST 剔除该记录，因为它不属于 `example.com` 域名

### Requirement: getDomainCandidates 返回单元素数组

`getDomainCandidates(domain)` 对合法域名 MUST 返回 `[normalizedDomain]`，对空输入 MUST 返回 `[]`。不得引入冗余的 Set 包装。

#### Scenario: 合法域名返回单元素数组
- **WHEN** 调用 `getDomainCandidates('www.example.com')`
- **THEN** SHALL 返回 `['example.com']`（经 normalizeDomain 去除 www 前缀并小写）

#### Scenario: 空输入返回空数组
- **WHEN** 调用 `getDomainCandidates('')` 或 `getDomainCandidates(null)`
- **THEN** MUST 返回 `[]`

