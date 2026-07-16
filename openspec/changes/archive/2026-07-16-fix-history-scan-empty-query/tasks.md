# Tasks: 修复历史扫描空字符串查询

## 实施任务

- [x] **T1: 简化 `getDomainCandidates`**
  - 文件：`scripts/domain-utils.js`
  - 移除 Set 冗余包装，对合法域名直接返回 `[normalizedDomain]`
  - 运行 `node --test` 确认 `domain-utils` 单元测试通过

- [x] **T2: 移除 background.js 空字符串查询**
  - 文件：`background.js`
  - 函数：`getHistoryItems()` 约第 260 行
  - 将 `Array.from(new Set([candidates[0], ...candidates, ''])).filter(text => text !== undefined)` 改为 `Array.from(new Set(candidates)).filter(Boolean)`

- [x] **T3: 移除 history.js 空字符串查询**
  - 文件：`scripts/history.js`
  - 函数：`getHistoryItemsFromPopup()` 约第 53 行
  - 与 T2 相同的改动

- [x] **T4: 语法校验**
  - 运行 `node --check background.js`
  - 运行 `node --check scripts/main.js`
  - 运行 `npm test`

- [x] **T5: 浏览器手动验证**
  - 在历史记录较多的浏览器 profile 中加载扩展
  - 打开一个有浏览历史的站点，观察 popup "记录" Tab 加载速度
  - 确认历史计数与修改前一致
  - 测试清理后复扫结果正确
  - 测试"包含子域名"开关切换后计数正确
