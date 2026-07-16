# Design: 历史扫描空字符串查询修复

## 当前实现

### 查询构造

`background.js` 和 `scripts/history.js` 各有一份相同的查询构造逻辑：

```javascript
const queryTexts = Array.from(
  new Set([candidates[0], ...candidates, ''])
).filter(text => text !== undefined);
```

`getDomainCandidates(domain)` 当前实现：

```javascript
export function getDomainCandidates(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) return [];
    const candidates = new Set();
    candidates.add(normalized);
    return Array.from(candidates).filter(Boolean);
}
```

该函数永远返回单元素数组 `[normalized]`。因此 `new Set([candidates[0], ...candidates, ''])` 实际等价于 `new Set([normalized, normalized, ''])` = `[normalized, '']`。

空字符串 `''` 作为 `chrome.history.search({ text: '' })` 的参数会触发全量返回。

### 数据流

```
getHistoryItems(domain, timeRangeMs, includeSubdomains)
  │
  ├─ candidates = ['example.com']
  │
  ├─ queryTexts = ['example.com', '']   ← 空字符串是问题根源
  │
  ├─ Promise.all([
  │     search({ text: 'example.com' })  → ~30 条匹配
  │     search({ text: '' })             → ~5000 条全量  ← 浪费
  │   ])
  │
  └─ mergeHistorySearchResults(...)
       └─ filterHistoryItems(全部结果, candidates, ...)
            ← 遍历 5030 条，去重后保留 ~30 条
```

## 修改后实现

### 查询构造

移除空字符串和冗余的 `candidates[0]`：

```javascript
const queryTexts = Array.from(new Set(candidates)).filter(Boolean);
```

由于 `getDomainCandidates` 已保证元素非空且去重，此处可简化为直接使用 `candidates`。但保留 `Set + filter` 作为防御性写法，防止未来 `getDomainCandidates` 演进为返回多元素时出现重复查询。

### getDomainCandidates 简化

移除不必要的 Set 包装：

```javascript
export function getDomainCandidates(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) return [];
    return [normalized];
}
```

### 修改后数据流

```
getHistoryItems(domain, timeRangeMs, includeSubdomains)
  │
  ├─ candidates = ['example.com']
  │
  ├─ queryTexts = ['example.com']   ← 无空字符串
  │
  ├─ Promise.all([
  │     search({ text: 'example.com' })  → ~30 条匹配
  │   ])
  │
  └─ mergeHistorySearchResults(...)
       └─ filterHistoryItems(~30条, candidates, ...)
            ← 仅遍历 30 条
```

## 涉及的代码位置

| 文件 | 函数 | 改动 |
| --- | --- | --- |
| `background.js` | `getHistoryItems()` L260 | `queryTexts` 构造移除空字符串 |
| `scripts/history.js` | `getHistoryItemsFromPopup()` L53 | 同上 |
| `scripts/domain-utils.js` | `getDomainCandidates()` L8-14 | 移除 Set 冗余 |

## 不改动的部分

- `filterHistoryItems` — 匹配算法不变，仍是 `matchesCandidates` + `urlMatchesCandidates` 兜底
- `mergeHistorySearchResults` — 合并去重逻辑不变
- `summarizeHistoryClear` — 清理结果汇总不变
- `HISTORY_MAX_RESULTS` 常量不变（仍作为单次查询上限保护）

## 测试策略

现有测试覆盖 `domain-utils`、`history-model` 的纯函数。本次改动主要影响与 `chrome.history` API 交互的查询构造部分，难以纯单元测试覆盖。

验证方式：
1. `node --check` 语法校验
2. 手动浏览器验证：打开有较多历史记录的站点，观察 popup 历史统计加载速度
3. 验证历史计数正确性不受影响（与修改前计数一致）
4. 验证清理后复扫结果正确
