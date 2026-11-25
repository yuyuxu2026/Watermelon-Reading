# 西瓜阅读

本地 TXT 电子书阅读器。基于 Electron + React + TypeScript，专注安静、离线的阅读体验。

## 功能

- 导入本地 `.txt` 文件，自动识别 UTF-8 / GBK·GB18030 / UTF-16
- 书架管理：打开、查看进度、移除书籍
- 滚动阅读，长文本分段按需加载
- 自动识别章节目录并支持跳转（第X章/回/节、序章、楔子、Chapter N 等）
- 自动保存阅读位置与进度
- 字号与主题（纸张 / 明亮 / 夜间）本地持久化
- 导入后保存应用内副本，原文件移动或删除后仍可继续阅读

单文件上限 **64 MB**。当前 MVP **不包含**：EPUB/PDF、搜索、书签、笔记、账号与云同步。

## 环境要求

- Node.js 18+（建议 LTS）
- Windows（当前主要验证平台）

## 快速开始

```bash
npm install
npm run dev
```

成功后会自动打开「西瓜阅读」窗口。若提示 Electron 未正确安装，可设置镜像后重装：

```bash
Remove-Item -Recurse -Force node_modules\electron
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
npm install electron --save-dev
node node_modules\electron\install.js
```

### 使用

1. 点击 **导入 TXT**，选择本地文本文件  
2. 导入成功后自动进入阅读页  
3. 滚动阅读；进度与设置会自动保存  
4. 返回书架可继续打开其他书籍  

### 生产模式启动

```bash
npm run build
npm start
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发模式（Vite + Electron） |
| `npm run build` | 构建前端与 Electron 主进程 |
| `npm start` | 启动已构建的应用 |
| `npm test` | 运行单元测试 |
| `npm run verify` | 测试 + 产品文档校验 |
| `npm run dist` | 打包 Windows NSIS 安装包 |

## 技术栈

- **桌面壳**：Electron
- **界面**：React 19 + Vite 6
- **语言**：TypeScript
- **编码**：`iconv-lite`（GBK / UTF-16）
- **测试**：Vitest

## 数据存放

书架元数据、阅读进度、设置，以及导入后的 TXT 副本，均保存在 Electron 用户数据目录下的 `library` 中。应用**不会修改**你选择的原始文件。

## 开发说明

仓库约定见 [`AGENTS.md`](./AGENTS.md)；产品范围见 [`docs/product-design.md`](./docs/product-design.md)。

改动后请执行：

```bash
npm run verify
```

## License

Private / 未声明开源协议。
