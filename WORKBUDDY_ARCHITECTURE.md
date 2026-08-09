# Workbuddy 代码维护说明

这份文档写给后续维护 Workbuddy 的人看。它不作为 GitHub 首页使用说明的主体，而是用于避免新增模块时破坏旧功能或混淆数据边界。

## 文档分工

- `README.md`：写给其他使用者看的软件说明书，主要介绍 Workbuddy 有什么功能、怎么运行、数据如何备份。上传 GitHub 时需要同步更新。
- 桌面 `Workbuddy本地打开说明.md`：写给用户本人看的电脑操作手册，解释本地文件、本地服务、端口、桌面快捷方式、缓存、Git 等基础操作。涉及电脑文件层面的变化时同步更新。
- `WORKBUDDY_RULES.md`：项目协作原则，记录安全边界、Git/GitHub 规则、沟通方式。
- `WORKBUDDY_ARCHITECTURE.md`：代码结构和模块边界说明，做功能改动前应先阅读。

## 当前项目形态

Workbuddy 是一个本地优先的静态网页应用，没有后端数据库，也不依赖 Node/Vite 构建流程。

主要文件：

- `index.html`：页面固定骨架、模块入口、基础表单容器、模板。
- `app.js`：主要交互逻辑、数据读写、渲染函数、导入导出。
- `styles.css`：全局样式、模块样式、移动端适配。
- `english-wordbanks.js`：每日英语词库数据。
- `manifest.webmanifest`：Chrome 桌面应用/PWA 配置。
- `sw.js`：离线缓存和桌面版缓存策略。
- `start-workbuddy.ps1`：启动本地服务，并用 Chrome 应用窗口打开 Workbuddy。
- `stop-workbuddy.ps1`：手动关闭本地服务的脚本。
- `启动Workbuddy.cmd`：可见窗口版启动入口，桌面 `Workbuddy` 快捷方式通过 `cmd.exe /c` 调用它。
- `后台启动Workbuddy.vbs`：备用后台启动入口，当前桌面快捷方式不再使用它。
- `关闭Workbuddy服务.cmd`：手动关闭服务入口，作为服务残留时的兜底工具。

## 数据边界

用户私人数据只保存在浏览器本地或用户导出的 JSON 备份中，不写进代码文件，也不上传 GitHub。

当前本地数据键：

- `workbuddy.tasks.v1`：每日计划任务、日程任务、中期目标和节点任务。
- `workbuddy.birthdays.v1`：生日记录。
- `workbuddy.english.v1`：每日英语学习进度、备注、复习次数、词组。
- `workbuddy.knowledge.v1`：知识文库分类、文档、回收站。
- `workbuddy.import-backup.v1`：导入备份前的本机恢复点。

注意：Chrome 会按访问地址隔离数据。以下地址不是同一份数据：

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `file:///C:/Users/qyc22/Documents/菜单/Workbuddy/index.html`
- `https://adrianqyc.github.io/Workbuddy/`

后续应固定推荐 `http://localhost:5173/index.html`。

## 模块边界

左侧主模块目前包括：

- `planner`：每日计划
- `english`：每日英语
- `knowledge`：知识文库

新增模块时应遵循：

- 使用独立的数据键，不混写到已有模块数据里。
- 在 `state.module` 下新增模块名。
- 为模块建立独立的视图状态，例如 `xxxView`。
- 在 `renderModules()`、模块按钮、模块内部 segments、`currentViewTitle()`、`currentViewMeta()` 中接入。
- 全局备份导出/导入/恢复要同步接入，但旧备份缺少新模块数据时不能清空当前新模块数据。

## 渲染入口

`render()` 是总入口，负责刷新当前页面状态。

当前主要流程：

- `renderModules()`：控制每日计划、每日英语、知识文库哪个模块显示。
- `renderSegments()`：每日计划内部栏目状态。
- `renderEnglishSegments()`：每日英语内部栏目状态。
- `renderKnowledgeSegments()`：知识文库内部栏目状态。
- `renderStats()`：每日计划和每日英语统计。
- `renderList()`：根据当前模块分发到对应渲染函数。

`renderList()` 中的模块分流不要互相穿透：

- `state.module === "english"` 时调用 `renderEnglishShell()`。
- `state.module === "knowledge"` 时调用 `renderKnowledgeShell()`。
- 其它情况才走每日计划任务列表。

## 每日计划

每日计划包含：

- 今天
- 日程
- 中期
- 生日
- 搜索

关键规则：

- 日程任务按任务条目计数。
- 中期目标按母任务计数，不按子任务计数。
- 中期子任务全完成后，母任务完成。
- 点击母任务完成按钮时，应一键完成母任务和全部子任务。
- 普通过期日程任务会顺延到今天。
- 已取消一次性日程任务保留原日期和取消原因，不再顺延。

改动每日计划时，重点检查：

- `filteredEntries()`
- `baseEntriesForView()`
- `todayEntries()`
- `scheduleEntries()`
- `mediumEntries()`
- `searchResults()`
- `unitCompletionStats()`
- `goalCompletionStats()`
- 拖拽排序相关函数

## 每日英语

每日英语包含：

- 今日
- 复习
- 词库
- 词组
- 搜索

关键规则：

- 词库数据来自 `english-wordbanks.js`。
- 用户学习进度、备注、复习次数保存在 `workbuddy.english.v1`。
- 每个词库独立统计已学和总数。
- 美式/英式发音依赖浏览器和系统语音，不保证每台设备都有完整语音包。

改动每日英语时，重点检查：

- `createEnglishTodayPanel()`
- `createEnglishReviewPanel()`
- `createEnglishLibraryPanel()`
- `createWordCard()`
- `createWordRow()`
- `normalizeEnglish()`
- `saveEnglish()`

## 知识文库

知识文库包含：

- 分类
- 新建
- 导入
- 回收站

关键规则：

- 系统自带 `未分类`，id 固定为 `uncategorized`。
- `未分类` 不允许删除，但允许重命名和参与手动排序。
- `未分类` 内部文档和其它分类内文档一样，允许手动排序、编辑、归类、导出和删除。
- 一篇文档可以属于多个分类，但正文只保存一份，不复制多份。
- 知识文库固定导航保留“新建”；编辑已有文档是进入同一个编辑器的临时状态，不作为固定导航项。
- 文档编辑页的编辑/预览切换只影响界面状态，保存的数据仍然是原始 Markdown 文本。
- Markdown 预览由本地 `renderMarkdownPreview()` 轻量渲染，不引入外部依赖，预览 HTML 必须先转义用户内容再插入页面。
- 删除文档或分类先进入回收站。
- 分类删除时，只属于该分类的文档进入回收站；同时属于其它分类的文档只移除该分类关系。
- 回收站恢复应尽量回到删除前的分类关系。
- 分类导出为 `.zip`，里面按分类文件夹保存 `.md` 文档。
- 单篇文档导出为 `.md`。
- 分类页批量模式只保存临时选择状态，不写入 `workbuddy.knowledge.v1`。
- 批量删除分类时，`未分类` 不能删除；只属于被删分类的文档进入回收站，多分类文档只移除被删分类关系。
- 批量删除中如果文档被单独选中，应按“删除文档”处理，避免通过恢复分类时意外恢复用户明确删除的文档。
- 批量移动当前只移动文档，不移动分类；添加到目标分类时应避免把已分类文档继续留在 `未分类`。
- 批量导出统一导出 `.zip`，选中文件夹按文件夹路径导出，单独选中的文档放入 `选中文档/`。
- 回收站批量恢复复用单项恢复逻辑；回收站批量彻底删除必须二次确认。
- 后续如增加文件夹套文件夹，分类应增加 `parentId`，并禁止把分类移动到自己或自己的子分类下。
- 移动端暂时采用同一套代码的响应式布局；知识文库手机端优先浏览、搜索和备份，复杂 Markdown 新建/编辑后续再做全屏编辑体验，不拆成电脑/手机两个版本。

改动知识文库时，重点检查：

- `renderKnowledgeShell()`
- `createKnowledgeCategoriesPanel()`
- `createKnowledgeEditorPanel()`
- `createKnowledgeTrashPanel()`
- `saveKnowledgeEditor()`
- `deleteKnowledgeCategory()`
- `deleteKnowledgeDocument()`
- `deleteSelectedKnowledgeItems()`
- `moveSelectedKnowledgeDocuments()`
- `exportSelectedKnowledgeItems()`
- `restoreKnowledgeTrash()`
- `restoreSelectedKnowledgeTrash()`
- `purgeSelectedKnowledgeTrash()`
- `normalizeKnowledge()`
- `saveKnowledge()`
- 知识文库拖拽排序相关函数

## 本地启动逻辑

桌面 `Workbuddy` 快捷方式目标是：

```text
C:\Windows\System32\cmd.exe
```

快捷方式参数是：

```text
/c ""C:\Users\qyc22\Documents\菜单\Workbuddy\启动Workbuddy.cmd""
```

这个 cmd 会运行：

```text
C:\Users\qyc22\Documents\菜单\Workbuddy\start-workbuddy.ps1
```

启动脚本做的事：

- 监听 `127.0.0.1:5173`。
- 把浏览器请求路径映射到 Workbuddy 项目文件夹。
- 读取浏览器请求时设置短超时，避免单个连接卡住后阻塞后续 `index.html`、`app.js`、`styles.css` 请求。
- 根据 `index.html`、`app.js`、`styles.css`、`sw.js`、`manifest.webmanifest` 的最新修改时间生成 `?wb=...` 启动参数，避免 Chrome 应用窗口继续使用旧缓存。
- 用 Chrome `--app=http://localhost:5173/index.html?wb=...` 打开应用窗口。
- 记录 `.workbuddy-service.pid`，供手动关闭服务使用。
- 记录 `.workbuddy-service.log`，用于排查启动是否成功；每次启动会覆盖旧日志，避免长期累积。
- 如果 5173 被之前记录的 Workbuddy 服务占用，先停止旧服务再重启，避免继续使用旧服务。
- 本地服务在可见黑色终端窗口中保持运行；关闭该窗口即可停止服务。

手动关闭服务使用：

```text
C:\Users\qyc22\Documents\菜单\Workbuddy\关闭Workbuddy服务.cmd
```

## 缓存和版本号

`index.html` 中 CSS/JS 使用查询参数版本号，例如：

```html
./styles.css?v=38
./app.js?v=38
```

`sw.js` 中也有缓存名，例如：

```js
const cacheName = "workbuddy-v38";
```

每次修改前端文件后，通常需要同步提升版本号，避免 Chrome 桌面版混用旧缓存。

`start-workbuddy.ps1` 还会在启动地址后自动添加 `?wb=文件修改时间戳`。这个参数只用于让 Chrome 重新请求最新文件，不改变 `localhost:5173` 的浏览器数据空间。

桌面 PWA 的 `manifest.webmanifest` 启动地址应保持固定：

```json
"start_url": "./index.html"
```

不要为了更新版本频繁修改成带 `?v=xx` 的启动地址，否则用户可能以为每次都要重新安装桌面应用。

## 样式维护原则

`styles.css` 中的全局 `input`、`select`、`button` 样式会影响整个应用。新增或修改全局样式后，必须检查 `checkbox`、`radio`、`file`、`date` 等特殊控件是否被误伤。

组件内部的特殊控件应使用更具体的选择器覆盖，例如：

```css
.knowledge-multi-dropdown input[type="checkbox"] {
  width: 16px;
  min-height: 16px;
}
```

做 UI 预览时优先加载真实 `styles.css`，不要只用简化测试样式判断最终效果。

## 修改前检查清单

做功能改动前：

1. 阅读 `WORKBUDDY_RULES.md`。
2. 如果是小文案、小样式、小 bug 修复，可以只读相关代码，不必阅读全文。
3. 如果涉及新模块、跨模块逻辑、数据结构、全局备份、启动脚本、缓存策略或较大重构，阅读本文件。
4. 确认要改的是哪个模块。
5. 确认是否涉及用户私人数据。
6. 确认是否需要同步全局备份。
7. 确认是否需要更新 README、桌面手册、本文件或 `WORKBUDDY_RULES.md`。

做完后至少检查：

```powershell
node --check app.js
node --check english-wordbanks.js
git diff --check
```

如果系统 PATH 没有 Node，可以使用 Codex 自带 Node 路径检查。

最终回复中要说明：

- 本次是否更新 `README.md`。
- 本次是否更新桌面 `Workbuddy本地打开说明.md`。
- 本次是否更新 `WORKBUDDY_ARCHITECTURE.md`。
- 本次是否更新 `WORKBUDDY_RULES.md`。

## 不要做的事

- 不要清空浏览器数据。
- 不要把用户任务、生日、英语记录、知识文库内容写入 GitHub。
- 不要把一个模块的数据混进另一个模块的数据结构。
- 不要为了新功能偷偷改掉用户已经确认过的旧交互。
- 不要把 `localhost`、`127.0.0.1`、`file://` 的数据当成同一份。
- 不要未经确认提交 Git 或上传 GitHub。
