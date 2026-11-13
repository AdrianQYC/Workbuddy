# Workbuddy 本地打开说明

## 从 GitHub 下载源码版

1. 打开 Workbuddy 的 GitHub Releases 页面，选择需要的版本并下载页面底部的 `Source code (zip)`。
2. 将 ZIP 解压到这台电脑上希望存放 Workbuddy 的文件夹。浏览器代码版不需要先安装 Node.js、pnpm 或 Electron。
3. 在解压后的项目目录中双击 `启动Workbuddy.cmd`。黑色终端窗口会运行本机网页服务，浏览器随后打开 Workbuddy。
4. 使用期间保持终端窗口打开；结束使用时关闭 Workbuddy 页面，再关闭终端窗口以停止服务。

v93 Release 提供源码 ZIP，不包含 Windows 安装包。只有 Release 页面明确显示 Windows `.exe` 附件时，才可按下面的桌面版步骤安装。

## Windows 桌面版

1. 只有在 GitHub Release 明确附带 Windows 安装包时，才下载并运行对应的 `.exe` 安装。v93 是源码发布，没有新的安装包。安装版按当前用户安装到 `D:\SOFTWARE\Workbuddy`。
2. 从 Windows“开始”菜单打开 Workbuddy。安装包不会自动打开程序，也不会替换现有桌面快捷方式。
3. 如果从旧版迁移，在旧版的“数据备份”中点击“导出备份”；然后在桌面版点击“导入备份”，选择刚导出的 JSON 文件，再点击“恢复数据”。
4. 点击程序右上角“设置”，可开启“关闭窗口时最小化到托盘”和“开机时启动并最小化到托盘”。开机启动只有安装版可设置。
5. 收进托盘后，单击托盘图标可打开窗口；右键可打开 Workbuddy、进入设置或退出程序。选择“退出 Workbuddy”会同时关闭程序管理的本地服务。

网页版本和 Windows 桌面版使用彼此独立的数据目录。桌面版运行数据和设置保存在 `%APPDATA%\Workbuddy`；导入备份会把数据写入当前版本，不需要先清理 Chrome 数据。卸载程序默认保留该目录；确认 JSON 备份可用后，若要彻底清理，再手动删除它。

桌面版和旧浏览器版共用本机端口 `5173`。启动桌面版前，请先关闭旧版 Workbuddy 页面和黑色终端窗口；否则桌面版会提示端口已占用。

## 浏览器本地版

双击桌面 `Workbuddy` 快捷方式会打开可见的黑色终端窗口并启动本地服务，再用 Chrome 打开：

```text
http://localhost:5173/index.html
```

使用期间保持黑色终端窗口打开。用完后先关闭 Workbuddy 页面，再关闭黑色终端窗口即可停止本地服务。

## Electron 开发模式

桌面上的 `Workbuddy开发模式.lnk` 会直接启动 Electron 开发模式，读取当前 Workbuddy 项目目录中的源码，不需要手动打开命令提示符，也不需要重新生成安装包。原来的 `Workbuddy.lnk` 仍用于启动浏览器版。

本机开发模式使用的 Electron 运行文件位于 `%LOCALAPPDATA%\electron\Cache\electron-v45.0.0-win32-x64\electron.exe`；它是运行环境，不是安装版程序。桌面快捷方式和该缓存都不在 GitHub 源码仓库中。

Electron 开发模式与安装版共用 `%APPDATA%\Workbuddy` 中的软件数据和设置；在开发模式里保存的业务数据会出现在安装版中。它不会修改导入用的 JSON 备份文件。开发模式不能设置开机自启动；该功能需要在安装版设置页中验证。

浏览器版和 Electron 开发模式都使用本机 `5173` 端口，不能同时打开。启动 Electron 开发模式前，先关闭浏览器版页面和黑色终端；如果 Electron 窗口已收进托盘，从托盘右键菜单选择“退出 Workbuddy”可完整退出。

不同功能应使用哪个入口检查，见项目文档 [`开发与测试说明.md`](开发与测试说明.md)。

如果直接运行项目源码并自行构建桌面安装包，可在 Workbuddy 项目目录运行：

```powershell
pnpm install
pnpm desktop:build
```

安装包生成在 `release` 文件夹中；Git 忽略该文件夹。日常代码迭代不需要每次生成安装包；只有准备更新桌面版并由用户提出时才打包。构建需要 Electron 和 Windows 安装包工具，这些运行文件和缓存位于当前用户的 AppData。安装包如需分享，应作为 GitHub Release 附件单独发布，不放进源码提交。
