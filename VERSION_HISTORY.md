# Workbuddy 版本说明

本文档记录 Workbuddy 的本地版本、Git 版本和 GitHub 发布记录。这里只写功能层面的简要说明，不记录私人数据，也不展开具体代码。

## 版本概念

- 本地缓存版本：`index.html`、`app.js`、`styles.css`、`sw.js` 里使用的 `vXX`，主要用于让浏览器加载新文件，当前是 `v63`。
- Git 版本：每次 `git commit` 生成的代码快照，用提交哈希识别，例如 `209d40a`。
- GitHub 版本：已经推送到 GitHub `main` 分支上的 Git 提交。当前项目还没有单独建立 Git tag 或 GitHub Release。

## 本地缓存版本

### v50 母版

这是当前能直接对应到 GitHub 旧提交的母版。功能上已经包含每日计划、每日英语、知识文库、本地启动脚本、备份导入导出和基础离线缓存。

### v51-v60 本地连续开发

这段缓存号没有逐版留下人工说明，按能确认的功能归并记录：每日计划加入周期任务、周期完成记录、周期总结和日历；修复中期节点按日期排序；补充每日计划若干字段显示和占位文字细节；新增商品比价模块；统一手动排序交互。

### v61

修复知识文库 Markdown 预览里的有序列表显示问题，避免编辑区编号正常但预览区每项都显示为 `1`。

### v62

每日计划新增统一“备注”能力。普通任务、中期目标、节点任务和周期任务都可以写多行备注，并通过“清单”按钮添加可勾选分项。

### v63

统一每日计划各栏任务按钮顺序。删除“安排到今天”按钮和对应功能入口，将“详/详情”统一改为“备/备注”。

## Git / GitHub 提交记录

当前仓库尚未使用 Git tag 或 GitHub Release，因此 GitHub 发布记录先按 `main` 分支提交记录理解。

- `acf1e32` - Initial Workbuddy app：建立 Workbuddy 初始版本，包含每日计划的基础任务管理。
- `c4ced0e` - Add canceled task records：新增任务取消记录，保留取消原因和原日期。
- `bebc8b2` - Bust Workbuddy asset cache：更新前端资源缓存版本，避免浏览器继续使用旧文件。
- `74d26e5` - Add collapsible schedule overview：优化日程栏分组和折叠展示。
- `c9db69f` - Add Workbuddy English module：新增每日英语模块，支持词库、今日学习、复习和词组。
- `209d40a` - Release Workbuddy knowledge and local startup update：发布知识文库模块，并完善本地启动脚本和桌面运行方式。
- `v63 本次发布` - Release Workbuddy v63 updates：将周期任务、商品比价、统一排序、备注清单和按钮统一等本地累计功能同步到 GitHub。具体提交哈希以本次发布后的 Git 记录为准。

## 发布维护规则

以后每次提升本地缓存版本号时，都要立刻检查并更新本文档：

- 如果提升了本地缓存版本号，补充对应 `vXX` 的简短说明。
- 如果只是修改代码但没有提升本地缓存版本号，可以不新增本地 `vXX` 记录。
- 如果创建了 Git tag 或 GitHub Release，补充对应版本说明。
- 如果只是普通 Git 提交，也要在最终回复里说明提交哈希和主要改动。
