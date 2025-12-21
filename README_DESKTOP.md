
# 如何打包为 Windows Exe 程序 (基于 Tauri)

本项目已配置为适配 **Tauri**，你可以轻松将其打包为轻量级、高性能的 Windows 桌面应用。

## 1. 环境准备

在开始之前，你需要安装 Rust 编程语言环境（Tauri 的底层依赖）。

1.  下载并安装 **Visual Studio C++ 生成工具** (需勾选 "使用 C++ 的桌面开发")。
2.  访问 [Rust 官网](https://www.rust-lang.org/tools/install) 下载 `rustup-init.exe` 并安装。
3.  安装完成后，在终端输入 `rustc --version` 确认安装成功。

## 2. 初始化 Tauri

在项目根目录下，打开终端（PowerShell 或 CMD），运行以下命令将 Tauri 添加到项目中：

```bash
# 1. 安装 Tauri CLI
npm install --save-dev @tauri-apps/cli

# 2. 初始化 Tauri 项目
npx tauri init
```

执行 `init` 时，请按以下提示选择：
- **What is your app name?** -> `BlindMark Pro`
- **What should the window title be?** -> `BlindMark Pro`
- **Where are your web assets (HTML/CSS/JS) located?** -> `dist` (这是 Vite 的默认输出目录)
- **What is the url of your dev server?** -> `http://localhost:1420`
- **What is your frontend dev command?** -> `npm run dev`
- **What is your frontend build command?** -> `npm run build`

## 3. 修改配置 (重要 - 解决白屏问题)

**这是最关键的一步！** 如果没有正确配置，你的 `.exe` 文件打开后可能是白屏，或者需要运行 `npm run dev` 才能工作。

请打开 `src-tauri/tauri.conf.json` 文件，找到 `build` 部分，确保配置如下：

```json
"build": {
  "beforeBuildCommand": "npm run build",   // 这一行确保打包前先编译React代码
  "beforeDevCommand": "npm run dev",
  "devPath": "http://localhost:1420",
  "distDir": "../dist"                     // 确保这里指向 ../dist
}
```

*注意：在 Tauri v2 中，`distDir` 可能被称为 `frontendDist`。*

同时，本项目已在 `vite.config.ts` 中添加了 `base: './'`，这对于 `.exe` 在没有服务器的环境下加载资源至关重要。

## 4. 开发与预览

在开发模式下像桌面软件一样运行它：

```bash
npx tauri dev
```

这将启动 Vite 服务器并弹出一个包含你应用的窗口。

## 5. 打包构建

运行以下命令生成最终的安装包和 `.exe` 文件：

```bash
npx tauri build
```

构建完成后，你可以在以下目录找到安装包：
`src-tauri/target/release/bundle/msi/` (安装包)
`src-tauri/target/release/bundle/nsis/` (安装包)

或者直接找到可执行文件：
`src-tauri/target/release/blind-mark-pro.exe`

## 常见问题

**Q: 打开软件白屏？**
A: 
1. 检查 `src-tauri/tauri.conf.json` 中的 `distDir` 是否指向 `../dist`。
2. 检查项目根目录下是否有 `dist` 文件夹（运行 `npm run build` 生成）。
3. 按 F12 打开控制台，看是否有报错。如果是 404 错误，通常是因为 `vite.config.ts` 缺少 `base: './'` 配置。

**Q: 保存图片没反应？**
A: 我们已经更新了代码，使用 Blob 对象转换来替代直接下载链接，现在应该可以在桌面端正常保存了。
