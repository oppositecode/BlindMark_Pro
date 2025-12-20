
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

## 3. 修改配置 (重要)

由于本项目的 `index.html` 使用了 CDN (`esm.sh` 和 `cdn.tailwindcss.com`)，为了确保打包后的 `.exe` 可以在**离线环境**下运行，强烈建议你进行以下操作（可选，但推荐）：

*如果不进行此步，打包出的软件必须联网才能打开界面。*

**推荐做法**：使用 `npm install` 安装本地依赖，而不是依赖 `index.html` 中的 CDN 链接。

如果不介意必须联网，则可以直接跳到第 4 步。

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
A: 请按 F12 打开开发者工具。如果是网络错误（404），通常是因为 `index.html` 中的 CDN 资源加载失败。请确保电脑已联网，或者将 CDN 资源下载到本地引用。

**Q: 只有文本没有样式？**
A: 同样是因为 Tailwind CSS 是通过 CDN 加载的。建议通过 `npm install -D tailwindcss postcss autoprefixer` 进行本地化配置。
