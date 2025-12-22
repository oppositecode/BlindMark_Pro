
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
- **Where are your web assets (HTML/CSS/JS) located?** -> `build` (注意：本项目已配置 Vite 输出到 build 目录)
- **What is the url of your dev server?** -> `http://localhost:1420`
- **What is your frontend dev command?** -> `npm run dev`
- **What is your frontend build command?** -> `npm run build`

## 3. 修改配置 (重要!)

**修复报错：`Additional properties are not allowed ('identifier' was unexpected)`**

这是因为 **Tauri V2** 的配置文件结构变了。请打开 `src-tauri/tauri.conf.json` 并仔细检查以下两点：

### 3.1 修改 Bundle Identifier (必须在顶层)

请**不要**将 `identifier` 放在 `bundle` 对象里！它必须在文件的**最顶层**。

** 错误写法 (会导致报错):**
```json
"bundle": {
  "identifier": "com.blindmark.pro", // 错！V2 不允许在这里
  "active": true
}
```

** 正确写法 (Tauri V2):**
```json
{
  "productName": "BlindMark Pro",
  "version": "0.1.0",
  "identifier": "com.blindmark.pro",  // <--- 放在这里 (顶层)
  "build": { ... },
  "app": { ... },
  "bundle": {
    "active": true,
    ...
  }
}
```

### 3.2 解决白屏问题 (构建路径)

在 `src-tauri/tauri.conf.json` 的 `build` 部分，确保输出目录配置正确。

**Tauri V2 用户：**
请查找 `frontendDist` 字段（V2 使用此字段名）：
```json
"build": {
  "beforeDevCommand": "npm run dev",
  "beforeBuildCommand": "npm run build",
  "devUrl": "http://localhost:1420",
  "frontendDist": "../build"             // 必须指向 Vite 的输出目录 (我们已将 vite.config.ts 改为输出到 build)
}
```

**Tauri V1 用户：**
请查找 `distDir` 字段：
```json
"build": {
  "beforeDevCommand": "npm run dev",
  "beforeBuildCommand": "npm run build",
  "devPath": "http://localhost:1420",
  "distDir": "../build"
}
```

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
1. 检查 `tauri.conf.json` 中的 `frontendDist` 是否指向 `../build`。
2. 检查项目根目录下是否有 `build` 文件夹（运行 `npm run build` 生成）。
3. 检查 `vite.config.ts` 是否包含 `base: './'`（本项目已配置）。

**Q: 保存图片没反应？**
A: 本项目代码已更新，使用 Blob 对象转换来替代直接下载链接，现在应该可以在桌面端正常保存了。
