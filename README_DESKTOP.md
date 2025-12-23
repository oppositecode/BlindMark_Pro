
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
- **What is your frontend dev command?** -> `npm run dev`
- **What is your frontend build command?** -> `npm run build`

## 3. 修改配置 (重要!)

**修复报错：`Additional properties are not allowed ('identifier' was unexpected)`**

请打开 `src-tauri/tauri.conf.json` 并确保 `identifier` 在顶层。
**关键步骤**：你必须在 `app.security` 中添加 `"capabilities": ["default"]`，否则所有权限都会被拒绝！

```json
{
  "productName": "BlindMark Pro",
  "version": "0.1.0",
  "identifier": "com.blindmark.pro",
  "build": {
    "frontendDist": "../build",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "withGlobalTauri": true, 
    "security": { 
      "csp": null,
      "capabilities": ["default"] 
    }
  },
  "bundle": { "active": true }
}
```

## 4. 修复“保存”功能 (Tauri V2 必读!)

**这是最关键的一步！** 如果你使用最新的 Tauri V2（`npx tauri init` 默认安装 V2），仅仅在 JS 中写代码是不够的。你必须在 Rust 侧显式注册文件系统插件。

### 4.1 安装 Rust 插件
在 `src-tauri` 目录下打开终端，运行：

```bash
cd src-tauri
npm install @tauri-apps/plugin-fs @tauri-apps/plugin-dialog
cargo add tauri-plugin-fs tauri-plugin-dialog
```

### 4.2 修改 `src-tauri/src/lib.rs`
打开 `src-tauri/src/lib.rs` (如果是旧模版可能是 `main.rs`)，修改 `run` 函数，将插件注册进去：

```rust
// src-tauri/src/lib.rs

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 👇👇👇 必须添加这两行 👇👇👇
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // 👆👆👆 必须添加这两行 👆👆👆
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 4.3 允许权限 (tauri.conf.json)
确保你已经按照**第3步**配置了 `"capabilities": ["default"]`。这会加载 `src-tauri/capabilities/default.json` 文件中的权限。

## 5. 开发与预览

```bash
npx tauri dev
```

## 6. 打包构建

```bash
npx tauri build
```
构建出的 exe 文件在 `src-tauri/target/release/` 目录下。
