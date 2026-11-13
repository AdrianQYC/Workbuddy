# Workbuddy 代码维护说明

这份文档写给后续维护 Workbuddy 的人看。它不作为 GitHub 首页使用说明的主体，而是用于避免新增模块时破坏旧功能或混淆数据边界。

## 文档分工

- `README.md`：写给其他使用者看的软件说明书，主要介绍 Workbuddy 有什么功能、怎么运行、数据如何备份。上传 GitHub 时需要同步更新。
- 桌面 `Workbuddy本地打开说明.md`：写给用户本人看的电脑操作手册，解释本地文件、本地服务、端口、桌面快捷方式、缓存、Git 等基础操作。涉及电脑文件层面的变化时同步更新。
- `WORKBUDDY_RULES.md`：项目协作原则，记录安全边界、Git/GitHub 规则、沟通方式。
- `WORKBUDDY_ARCHITECTURE.md`：代码结构和模块边界说明；快改档不必阅读全文，结构/数据档按相关小节阅读。

## 当前项目形态

Workbuddy 的业务界面是本地优先的静态网页，没有后端数据库。Windows 桌面版使用 Electron 提供原生窗口和托盘；桌面主进程托管本机静态 HTTP 服务，网页业务代码保持独立。

主要文件：

- `index.html`：页面固定骨架、模块入口、基础表单容器、模板。
- `app.js`：主要交互逻辑、数据读写、渲染函数、导入导出。
- `styles.css`：全局样式、模块样式、移动端适配。
- 桌面宽屏布局由窗口高度约束，左侧模块导航和数据备份区保持固定，右侧内容区独立滚动；窄屏保留自然页面滚动。
- `english-wordbanks.js`：每日英语词库数据。
- `manifest.webmanifest`：Chrome 桌面应用/PWA 配置。
- `sw.js`：离线缓存和桌面版缓存策略。
- `start-workbuddy.ps1`：启动本地服务，并用 Chrome 应用窗口打开 Workbuddy。
- `stop-workbuddy.ps1`：手动关闭本地服务的脚本。
- `启动Workbuddy.cmd`：可见窗口版启动入口，桌面 `Workbuddy` 快捷方式通过 `cmd.exe /c` 调用它。
- `后台启动Workbuddy.vbs`：备用后台启动入口，当前桌面快捷方式不再使用它。
- `关闭Workbuddy服务.cmd`：手动关闭服务入口，作为服务残留时的兜底工具。
- `desktop/main.cjs`：Electron 主进程，管理托盘、窗口、本地 HTTP 服务和 Windows 登录项。
- `desktop/preload.cjs`：向页面暴露有限的设置接口，不开放 Node.js 或文件系统访问。
- `desktop/installer.nsh`：NSIS 安装宏，将桌面程序按当前用户安装到 `D:\SOFTWARE\Workbuddy`。
- `package.json`：桌面应用启动、开发和 Windows 安装包构建配置。

## 数据边界

用户私人数据只保存在浏览器本地或用户导出的 JSON 备份中，不写进代码文件，也不上传 GitHub。

当前本地数据键：

- `workbuddy.tasks.v1`：每日计划任务、日程任务、中期目标和节点任务。
- `workbuddy.birthdays.v1`：生日记录。
- `workbuddy.recurrences.v1`：周期任务规则、每日完成/未完成/跳过记录和复盘数据。
- `workbuddy.english.v1`：每日英语学习进度、备注、复习次数、词组。
- `workbuddy.knowledge.v1`：知识文库分类、文档、回收站。
- `workbuddy.shopping.v1`：商品比价分类、商品单位、购买记录和包装规格。
- `workbuddy.cocktail.v1`：调酒笔记的二级标签、材料和配方。
- `workbuddy.import-backup.v1`：导入备份前的本机恢复点。

调酒笔记材料和配方图片以 Blob 保存在当前浏览器数据空间的 IndexedDB（数据库 `workbuddy-cocktail-images`），对应记录只保存图片 ID。导出 JSON 时会把图片转为 Base64 一并打包；导入时写回 IndexedDB，因此跨电脑迁移仍只需导入一个 JSON 文件。删除材料会同步解除配方材料的跳转关系并保留名称及分类快照；删除二级标签只会把材料转入未分类，不删除材料或图片。

注意：Chrome 会按访问地址隔离数据。以下地址不是同一份数据：

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `file:///<Workbuddy 项目目录>/index.html`
- `https://adrianqyc.github.io/Workbuddy/`

后续应固定推荐 `http://localhost:5173/index.html`。

## 模块边界

左侧主模块目前包括：

- `planner`：每日计划
- `english`：每日英语
- `knowledge`：知识文库
- `shopping`：商品比价
- `cocktail`：调酒笔记，包含推荐、配方、吧台三个页面；“新建配方”是从配方页进入的独立编辑页。

新增模块时应遵循：

- 使用独立的数据键，不混写到已有模块数据里。
- 在 `state.module` 下新增模块名。
- 为模块建立独立的视图状态，例如 `xxxView`。
- 在 `renderModules()`、模块按钮、模块内部 segments、`currentViewTitle()`、`currentViewMeta()` 中接入。
- 全局备份导出/导入/恢复要同步接入，但旧备份缺少新模块数据时不能清空当前新模块数据。
- 调酒笔记使用独立的 `workbuddy.cocktail.v1` 数据键，并纳入 JSON 导入、导出和导入前恢复；旧备份没有 `cocktail` 字段时应保留当前调酒笔记数据，旧版 `cocktail` 没有 `recipes` 或 `recommendationPlaylists` 字段时分别保留当前配方或推荐酒单。
- 手动排序优先接入通用 `setupSortableElement()`，用 `☰` 拖动按钮或明确的标签拖动区触发，不要再新增上下箭头式排序逻辑。

### 调酒笔记：吧台材料与配方

- 一级分类固定为基础烈酒、利口酒、酸性成分、甜味成分、调和液体、调味剂、果蔬装饰、其它；各一级分类可拥有自己的二级标签。
- 每个材料只属于一个一级分类，并且只能属于该一级分类下的一个二级标签，或留在固定“未分类”中。未分类不可改名或删除；删除二级标签时，材料转入未分类。
- 二级标签可以新增；每个标签上的“⋯”管理按钮负责重命名或删除。材料卡片内提供编辑和删除按钮；新建材料时默认未分类，编辑时可改一级分类和二级标签。
- 材料记录包括中文名称（必填）、英文名称（选填）、一级分类、可选二级标签、介绍和可选图片。卡片和详情页都可进入编辑；修改一级分类或二级标签后，材料按新分类归位。缺少图片时统一显示白底“空”占位图。
- 吧台和配方页共享一级分类与二级标签，各自提供“全部”；配方分类从配方材料当前所属分类推导。同一配方在多个材料分类中出现时，“全部”仍只显示一张配方卡片。
- 配方记录包括中文标题（必填）、英文标题（选填）、简介、图片、材料、制作方法和备注。新建/编辑时至少需要一项材料；每个材料行只要求从下拉联想中选择吧台已有材料，度数和用量默认为 0。选中材料后输入框替换为材料标签；保存名称联想结果时记录材料 ID 和名称/分类快照。点击仍存在的材料可打开吧台详情；材料删除后配方记录保留为不可点击的文字。
- 材料单位可选 `mL`、`g`、`个`、`片`、`滴`、`勺`；度数默认为 0%，用量默认为 0。最终酒精度按所有 `mL` 行的用量加权计算，其它单位不参与；其它单位填入非零度数时在编辑页提示。
- 搜索需点击搜索按钮或按 Enter 后执行。吧台搜索中英文名称和介绍；配方搜索中英文标题、简介、材料名称和备注、制作方法及配方备注。
- 图片压缩后存入 IndexedDB；JSON 备份把材料与配方图片以 Base64 一并导出，导入时恢复图片和关联。IndexedDB 与 localStorage 一样按浏览器数据空间隔离，不能仅靠复制源码目录迁移。
- 当前 v93 已实现吧台材料、分类标签管理、材料搜索，以及配方列表、详情、编辑/新建、材料联想关联、酒精度计算和配方搜索；新建/编辑表单直接处理提交，避免浏览器默认跳页。
- 推荐页数据存放在 `workbuddy.cocktail.v1` 的 `recommendationPlaylists` 中。每条酒单含唯一 ID、一级分类 ID、名称、配方 ID 列表和首页展示标记；酒单只保存配方关联，不复制配方。时令首页按当前节气和酒单名称匹配，风味/场景按首页展示标记显示（未设置时取该类第一条）。删除酒单或从酒单移除配方只改推荐关联，不删除配方；删除配方时归一化数据会清除无效的酒单配方 ID。添加配方时仅可从已有配方多选，同一酒单内不重复。
- 推荐页视图状态包括首页、一级分类酒单列表、完整酒单和只读配方详情；推荐详情返回原酒单。配方图片继续使用配方记录已有的图片 ID，不在推荐数据中复制图片。JSON 导出会随调酒数据包含推荐酒单；导入旧版调酒备份未带 `recommendationPlaylists` 时保留当前推荐酒单。

## 渲染入口

`render()` 是总入口，负责刷新当前页面状态。

当前主要流程：

- `renderModules()`：控制每日计划、每日英语、知识文库、商品比价、调酒笔记哪个模块显示。
- `renderSegments()`：每日计划内部栏目状态。
- `renderEnglishSegments()`：每日英语内部栏目状态。
- `renderKnowledgeSegments()`：知识文库内部栏目状态。
- `renderCocktailModule()`：调酒笔记内部页面和独立新建配方页面状态。
- `renderStats()`：每日计划和每日英语统计。
- `renderList()`：根据当前模块分发到对应渲染函数。
- `init()` 绑定事件后立即同步执行首次 `render()`；桌面设置读取和调酒图片 IndexedDB 加载在后台完成，不能阻断每日计划等模块的首屏显示。
- `init()` 绑定事件后立即同步执行首次 `render()`；桌面设置读取和调酒图片 IndexedDB 加载在后台完成，不能阻断每日计划等模块的首屏显示。

`renderList()` 中的模块分流不要互相穿透：

- `state.module === "english"` 时调用 `renderEnglishShell()`。
- `state.module === "knowledge"` 时调用 `renderKnowledgeShell()`。
- `state.module === "shopping"` 时调用 `renderShoppingShell()`。
- `state.module === "cocktail"` 时调用 `renderCocktailModule()`。
- 其它情况才走每日计划任务列表。

## 模态框

- 页面内模态框使用 `openWorkbuddyModal()` 作为底座，背景压暗并阻止背景操作。
- 删除、导入、恢复等危险确认使用 `confirmDangerAction()`，不要新增浏览器原生 `confirm()`。
- 需要编辑多个字段的普通输入场景，应优先做 Workbuddy 风格表单模态框，不要用连续 `prompt()`。
- 非阻断的成功、取消和轻提醒反馈可使用 `showWorkbuddyToast()` 轻提示；危险确认和需要用户处理的失败继续使用 Workbuddy 模态框。

## 每日计划

每日计划包含：

- 今天
- 日程
- 中期
- 周期
- 生日
- 搜索

关键规则：

- 日程任务按任务条目计数。
- 中期目标按母任务计数，不按子任务计数。
- 中期子任务全完成后，母任务完成。
- 点击母任务完成按钮时，应一键完成母任务和全部子任务。
- 中期节点显示和“下一个节点”按节点日期升序；无日期节点排在有日期节点后面，同日期再按 `order` 排序。
- 普通过期日程任务会顺延到今天。
- 已取消一次性日程任务保留原日期和取消原因，不再顺延。
- 普通任务、中期目标、节点任务和周期任务都可以带 `note` 与 `checklist`；生日继续使用生日模块自己的 `note` 字段，不走通用备注面板。
- 通用 `checklist` 是结构化数组，清单勾选不自动完成任务，任务完成也不自动勾选清单。
- 周期任务使用独立数据键 `workbuddy.recurrences.v1`，不要混入 `workbuddy.tasks.v1`。
- 周期任务显示在“今天”页的周期分区，但不计入日程统计和总完成。
- 周期页单独统计完成、未完成、跳过记录，周期卡片默认显示该任务从开始到今天的总计。
- 每个周期卡片展开后可独立选择起止日期，并按原始日期记录临时计算该时间段总结；长时间段只显示最后 12 个月日历。
- 打开 Workbuddy 时，过去该做但没有记录的周期日期补记为未完成；当天只显示待完成，不提前算失败。
- 周期页支持按住 `☰` 拖动排序，“今天”页周期分区继承周期页顺序。

改动每日计划时，重点检查：

- `filteredEntries()`
- `baseEntriesForView()`
- `todayEntries()`
- `scheduleEntries()`
- `mediumEntries()`
- `todayRecurrenceEntries()`
- `renderTodayRecurrences()`
- `renderRecurrenceList()`
- `isRecurrenceDueOn()`
- `markMissedRecurrences()`
- `recurrencePeriodStats()`
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
- 词组保存在 `english.groups`；词组可保存 `defaultPartSpeech` 和 `note`，词组内每个单词保存为对象，包含 `word`、`partSpeech`、`translation`、`note`。
- 旧词组数据里的 `words: string[]` 要继续兼容，规范化时转换为新单词对象数组。
- 词组内添加和修改单词使用 Workbuddy 页面内模态框，不使用浏览器原生 `prompt()` 连续输入。
- 美式/英式发音依赖浏览器和系统语音，不保证每台设备都有完整语音包。

改动每日英语时，重点检查：

- `createEnglishTodayPanel()`
- `createEnglishReviewPanel()`
- `createEnglishLibraryPanel()`
- `createEnglishGroupsPanel()`
- `createEnglishGroupCard()`
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
- 分类支持无限级文件夹，分类对象使用 `parentId` 指向父文件夹；旧分类没有 `parentId` 时按根文件夹兼容。
- 子文件夹和直接文档可以在同一个父文件夹下并列存在；子文件夹内文档不在父文件夹直接文档列表里重复显示。
- 当前版本通过“移动到”菜单改变文件夹父级；分类手动排序只在同一父文件夹下生效。
- 移动文件夹时只修改该文件夹的 `parentId` 和同级 `order`，子文件夹和文档关系随树结构自然移动；必须禁止把分类移动到自己或自己的子分类下。
- 一篇文档可以属于多个分类，但正文只保存一份，不复制多份。
- 知识文库固定导航保留“新建”；编辑已有文档是进入同一个编辑器的临时状态，不作为固定导航项。
- 知识文库编辑器使用运行期标签页状态 `knowledgeEditorTabs` 和 `activeKnowledgeEditorTabId`；多个新建/编辑文档可以同时打开，未保存内容只保存在当前页面内存，不写入 `workbuddy.knowledge.v1`。
- 打开已有文档时，如果对应标签已存在，应切换到已有标签而不是重复打开；关闭全部编辑标签后自动回到分类页。
- 文档保存后通过 `verifyKnowledgeDocumentSaved()` 从 `localStorage` 读回当前文档并核对标题、正文和分类；成功后清除未保存标记并显示轻提示，失败时保留标签内容和未保存标记并弹出提示。
- 文档编辑页的编辑/预览切换只影响界面状态，保存的数据仍然是原始 Markdown 文本。
- Markdown 预览由本地 `renderMarkdownPreview()` 轻量渲染，不引入外部依赖，支持常用标题、列表、引用、代码块和管道表格；预览 HTML 必须先转义用户内容再插入页面。
- 知识文库单篇导入支持 `.md`、`.markdown` 和 `.txt`，导入后先进编辑标签，确认保存后才写入 `workbuddy.knowledge.v1`。
- ZIP 导入使用浏览器本地解析，不依赖在线服务；支持常见未压缩和 Deflate ZIP，只导入 `.md`、`.markdown`、`.txt`，其它文件忽略并在预览里提示数量。
- ZIP 带文件夹结构时，可导入到顶层或已有文件夹下，ZIP 内文件夹按层级建立，同级同名文件夹复用；ZIP 散装文档可导入未分类、已有文件夹，或新建一级/子文件夹后导入。
- ZIP 导入只新增文档，不覆盖已有文档；同名文档标题自动追加序号。
- 删除文档或分类先进入回收站。
- 分类删除按整棵子树处理；删除上级文件夹时默认删除下级文件夹，只属于被删树的文档进入回收站，同时属于其它分类的文档只移除被删树内分类关系。
- 回收站恢复应尽量回到删除前的分类层级和文档分类关系。
- 分类导出为 `.zip`，里面按文件夹层级保存 `.md` 文档。
- 单篇文档导出为 `.md`。
- 分类页批量模式只保存临时选择状态，不写入 `workbuddy.knowledge.v1`。
- 批量模式选择分类时，应同步选择该分类的全部下级分类和下级文档；取消分类时同步取消这棵子树。只单独选择部分文档时，分类只显示半选状态，不自动加入 `selectedCategories`，避免批量删除误删分类。
- 批量删除分类时，`未分类` 不能删除；选中的父文件夹按子树删除，只属于被删树的文档进入回收站，多分类文档只移除被删树内分类关系。
- 批量删除中如果文档被单独选中，应按“删除文档”处理，避免通过恢复分类时意外恢复用户明确删除的文档。
- 批量移动当前只移动文档，不移动分类；添加到目标分类时应避免把已分类文档继续留在 `未分类`。
- 批量导出统一导出 `.zip`，选中文件夹按文件夹路径导出，单独选中的文档放入 `选中文档/`。
- 回收站批量恢复复用单项恢复逻辑；回收站批量彻底删除必须二次确认。
- 移动端暂时采用同一套代码的响应式布局；知识文库手机端优先浏览、搜索和备份，复杂 Markdown 新建/编辑后续再做全屏编辑体验，不拆成电脑/手机两个版本。

改动知识文库时，重点检查：

- `renderKnowledgeShell()`
- `createKnowledgeCategoriesPanel()`
- `createKnowledgeEditorPanel()`
- `createKnowledgeOpenTabs()`
- `openKnowledgeEditor()`
- `closeKnowledgeEditorTab()`
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

## 商品比价

商品比价用于手动记录购物收藏、平台购买记录和单价比较。

关键规则：

- 使用独立数据键 `workbuddy.shopping.v1`，不要混入任务、英语或知识文库数据。
- 购物数据只来自用户手动填写，不接入购物平台账号，不做自动抓取。
- 分类是三级结构：一级分类保存在 `categories`，二级分类保存在 `subcategories`，三级分类保存在 `tertiaryCategories`；商品通过 `categoryId`、可空的 `subcategoryId` 和可空的 `tertiaryCategoryId` 归类。
- 商品层级保存商品单位 `unit`；购买记录保存日期、本次名称、平台、总价、购买包装数、包装规格、购买链接和本次备注，其中日期、价格、购买包装数和包装字段允许为空。
- 新购买记录的 `packaging` 统一保存 `packageUnit`（外包装单位）、`innerQuantity` 与 `innerQuantityUnit`（包装内数量）、`contentAmount` 与 `contentUnit`（包装内含量）。不再保存或显示旧版 `quantity`、`pricingMode`、`mode`、`amount`、`count` 等字段。
- 填写包装内数量时，包装内含量表示每个内装单位的含量；包装内数量为空时，包装内含量表示整包总含量；两者都为空时，只能计算包装单价。包装单位、包装内数量单位和含量单位彼此独立。
- 记录可产生包装单价和内容单价；商品单位匹配包装单位或内容单位时，商品卡片使用匹配的价格。g/kg、ml/L 只做同维度全局换算，其他单位只做精确匹配。
- 购买记录里的 `name` 是本次购买名称，用于同一商品词条下区分不同品牌或规格；旧记录没有 `name` 时，显示层用商品词条名称兜底。
- 购买记录的 `purchaseLink` 保存用户手动填写的购买链接；记录列表和编辑表单都提供复制按钮。
- 旧购物数据里的 `standardCode` 和商品 `note` 在规范化时忽略，不再显示或写回；购买记录的 `note` 继续保留。
- 购买记录平台使用固定下拉选项：淘宝、京东、拼多多、抖音、盒马、阿里巴巴。
- 商品列表可在分类视图和平台视图间切换；平台视图从购买记录动态统计平台，每个商品按平台去重显示，展开后只显示所选平台的购买记录和该平台最低单价。没有购买记录的商品单独归入“未记录平台”；该视图状态只保存在内存中，不改变购物数据结构。
- 购买记录新增和修改使用商品卡片内的行内表单；日期允许留空，缺失时记录列表只显示名称和平台；新增时表单位于记录列表顶部，修改时当前记录行切换为编辑态，不使用浏览器原生连续 `prompt()`。
- 单价不单独保存，渲染时根据包装单位、包装内数量和包装内含量临时计算；总价、购买包装数或必要的包装数据为空，或数量不大于 0 时，不计算对应单价并显示为空。
- 总价默认单位为元；商品单位和包装规格中的单位是自由文本，只有 g/kg、ml/L 等可识别同维度单位自动换算。
- 分类区采用左侧目录式布局，一级、二级和三级分类分区显示；三级分类仅在选中具体二级分类后显示；分类/平台切换也位于左侧导航，商品搜索和排序属于右侧商品列表工具栏。平台筛选与搜索条件组合，“当前视图”导出遵循当前平台筛选。
- 商品比价导出使用前端生成 `.xlsx`，导出范围支持全部、当前视图和自定义一级/二级/三级分类；工作簿包含购买记录明细、商品汇总和导出说明。
- `.xlsx` 由 `createXlsxBlob()` 生成，复用项目内无压缩 ZIP 生成器，不依赖外部库。
- 商品支持手动拖动排序；一级、二级和三级分类标签也支持拖动排序，二级分类只在所属一级分类内排序，三级分类只在所属二级分类内排序。
- 旧备份没有 `shopping` 字段时，导入和恢复都应保留当前本机购物数据，不能清空。

改动商品比价时，重点检查：

- `renderShoppingShell()`
- `createShoppingCategoryTabs()`
- `createShoppingSubcategoryTabs()`
- `createShoppingProductForm()`
- `createShoppingProductCard()`
- `createShoppingRecordSection()`
- `createShoppingRecordEditor()`
- `createShoppingRecordRow()`
- `updateShoppingRecord()`
- `openShoppingExportModal()`
- `createShoppingWorkbookBlob()`
- `shoppingVisibleProducts()`
- `shoppingBestRecord()`
- `shoppingRecordPriceDetails()`
- `normalizeShoppingPackaging()`
- `normalizeShopping()`
- `saveShopping()`

## 本地启动逻辑

### Windows 桌面版

- 浏览器代码版和 Electron 开发版共用项目里的页面与业务源码，不是两条独立开发线。日常修改直接改 Workbuddy 源码；Electron 主进程和桌面接口为同一套页面补充窗口、托盘、开机自启动等能力。浏览器环境没有 Electron 接口时，桌面专属功能会隐藏或不可用。
- `desktop/main.cjs` 在 Electron 主进程中监听 `127.0.0.1:5173`，只提供应用静态资源；页面继续通过固定的 `http://localhost:5173` 加载。
- 主进程同时拥有窗口、托盘和 HTTP 服务；托盘菜单“退出 Workbuddy”会退出主进程并关闭服务，不会留下独立 PowerShell 服务进程。
- 窗口关闭策略由本机设置控制；托盘单击/双击打开窗口，右键菜单可打开窗口、进入设置或退出。
- `workbuddy-desktop-settings.json` 保存在 Electron 的用户配置目录，只存桌面开关，不保存在仓库，不包含 Workbuddy 业务数据。
- 开机自启动通过 Electron Windows 登录项接口配置；只有安装版中用户开启设置后才写入，启动参数 `--hidden` 使其登录后直接进入托盘。
- `pnpm desktop:dev` 和桌面 `Workbuddy开发模式.lnk` 用于 Electron 开发预览，直接读取当前源码；开发模式禁用开机自启动设置。开发模式与安装版共用 Electron 用户资料 `%APPDATA%\Workbuddy`，其中包含业务 localStorage 和桌面设置。`pnpm desktop:build` 生成 Windows 安装包到 `release/`，安装时目标目录固定为 `D:\SOFTWARE\Workbuddy`，只安装给当前用户。卸载默认保留数据。渲染进程关闭 Node 集成并启用 context isolation 与 sandbox。
- Git 跟踪 Electron 源码、构建配置与锁文件；`node_modules/`、`.pnpm-store/`、`.build-tmp*/` 和 `release/` 忽略。安装包作为 GitHub Release 附件单独发布；用户资料和 JSON 备份不上传。
- Electron 有独立于 Chrome 的浏览器数据目录。即使二者都用 `localhost:5173`，`localStorage` 也不共享；从 Chrome 迁移时需要手动导出 JSON，再在桌面版导入。导出的源 JSON 不会被改写。
- 桌面 `Workbuddy.lnk` 保留为浏览器版入口，继续调用项目 `.cmd`/PowerShell 启动方式；`Workbuddy开发模式.lnk` 直接调用本机 Electron 运行文件并传入当前项目目录。两个快捷方式和 Electron 缓存都是本机文件，不随 GitHub 仓库同步。
- 浏览器版、Electron 开发模式和 Electron 安装版的功能测试范围记录在 `开发与测试说明.md`：业务界面优先用浏览器版；托盘、窗口和本地服务生命周期用 Electron 开发模式；开机自启动和安装行为只能用安装版验证。两个 Electron 入口共用 `%APPDATA%\Workbuddy`，浏览器版使用独立的 Chrome 数据空间。
- 日常源码迭代不自动构建安装包；只有用户明确要求更新桌面版时才运行 `pnpm desktop:build`。构建安装包不会自动安装、启动、提交 Git 或上传 GitHub。

### 旧版 Chrome/PWA 回退方式

桌面 `Workbuddy` 快捷方式目标是：

```text
C:\Windows\System32\cmd.exe
```

快捷方式参数是：

```text
/c ""<Workbuddy 项目目录>\启动Workbuddy.cmd""
```

这个 cmd 会运行：

```text
<Workbuddy 项目目录>\start-workbuddy.ps1
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
<Workbuddy 项目目录>\关闭Workbuddy服务.cmd
```

## 缓存和版本号

`index.html` 中 CSS/JS 使用查询参数版本号，例如：

```html
./styles.css?v=81
./app.js?v=81
```

`sw.js` 中也有缓存名，例如：

```js
const cacheName = "workbuddy-v81";
```

每次修改前端文件后，通常需要同步提升版本号，避免 Chrome 桌面版混用旧缓存。

例外：调酒笔记首轮功能统一归入 `v93`。首轮开发中的所有调酒功能继续累计在 v93；推荐内容和调酒笔记首轮功能初步完成后才开始 v94。期间不因每次迭代重复提升缓存版本。

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
2. 如果新对话提供了交接文档或启动包，优先按最新交接内容确认 Git 状态、缓存版本、未完成事项和关键风险；不要依赖“见旧对话开头”这类不可见上下文。
3. 如果是文案、小样式、按钮位置、局部 UI 或单个 bug，且不改数据结构、备份、缓存、启动或跨模块逻辑，可以只读相关代码，不必阅读全文。
4. 如果是模块内功能调整但不改全局备份、不改存储结构、不影响其它模块，只需阅读本文件对应模块小节。
5. 如果涉及新模块、跨模块逻辑、localStorage 字段、全局备份、导入导出、恢复数据、启动脚本、缓存策略、service worker 或较大重构，阅读本文件相关结构小节。
6. 只有确定要提升缓存版本、准备提交 Git 或准备上传 GitHub 时，才需要检查 `VERSION_HISTORY.md`。
7. 确认要改的是哪个模块。
8. 确认是否涉及用户私人数据。
9. 确认是否需要同步全局备份。
10. 确认是否需要更新 README、桌面手册、本文件或 `WORKBUDDY_RULES.md`；预览阶段可先不更新 README，功能稳定或发布前再补。

生成或更新交接文档时：

1. 写清当前 Git 状态、本地缓存版本、未完成事项和关键风险。
2. 写明新对话必须先读 `WORKBUDDY_RULES.md`。
3. 写入流程分档摘要：快改档、标准功能档、结构/数据档、发布/GitHub 档，避免新对话重新回到全量文档流程。

做完后至少检查：

```powershell
node --check app.js
git diff --check
```

只有修改 `english-wordbanks.js` 或相关导入逻辑时，才需要额外执行：

```powershell
node --check english-wordbanks.js
```

如果系统 PATH 没有 Node，可以使用 Codex 自带 Node 路径检查。

最终回复中要说明：

- 本次是否更新 `README.md`。
- 本次是否更新桌面 `Workbuddy本地打开说明.md`。
- 本次是否更新 `WORKBUDDY_ARCHITECTURE.md`。
- 本次是否更新 `WORKBUDDY_RULES.md`。
- 本次是否更新 `VERSION_HISTORY.md`；快改档可简写说明未涉及文档更新。

## 不要做的事

- 不要清空浏览器数据。
- 不要把用户任务、生日、英语记录、知识文库内容写入 GitHub。
- 不要把一个模块的数据混进另一个模块的数据结构。
- 不要为了新功能偷偷改掉用户已经确认过的旧交互。
- 不要把 `localhost`、`127.0.0.1`、`file://` 的数据当成同一份。
- 不要未经确认提交 Git 或上传 GitHub。
