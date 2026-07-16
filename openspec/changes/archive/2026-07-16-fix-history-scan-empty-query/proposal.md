# fix-history-scan-empty-query

移除历史扫描中的空字符串查询，避免每次扫描拉取全量浏览记录导致 popup 卡顿

## Why

历史扫描在构造 `chrome.history.search` 查询时，额外加入了空字符串 `''` 作为查询文本之一。`chrome.history.search({ text: '' })` 会返回整个浏览器历史记录（上限 `HISTORY_MAX_RESULTS = 5000` 条），随后才在 JS 中按域名过滤丢弃绝大部分结果。

每次打开 popup、切换时间范围、清除历史记录（清理前后各一次复扫）、无痕退出、切换语言、点刷新——都会触发该查询。对历史记录较多的用户累计造成 300ms-2.5s 无谓延迟。

## What Changes

- `scripts/domain-utils.js` — `getDomainCandidates` 移除冗余 Set 包装，直接返回单元素数组
- `background.js` — `getHistoryItems()` 的 `queryTexts` 构造移除空字符串
- `scripts/history.js` — `getHistoryItemsFromPopup()` 的 `queryTexts` 构造移除空字符串

移除空字符串查询后，`chrome.history.search({ text: 'example.com' })` 已只返回 URL/title 中包含该域名的记录，数据量从最多 5000 条降到几十条。`filterHistoryItems` 仍做精确域名匹配，保证结果正确性不变。
