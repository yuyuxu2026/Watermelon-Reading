# 西瓜阅读

基于 Electron、React 和 TypeScript 的本地 TXT 阅读器 MVP。

## 开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm run verify
npm run build
```

`npm run dev` 会启动 Vite 开发服务器和 Electron。书架数据与导入后的 TXT 副本保存在 Electron 的本地用户数据目录中，原始文件不会被修改。

当前版本支持 UTF-8、GBK/GB18030 和 UTF-16 TXT 文件，单文件上限为 64 MB。MVP 暂不包含 EPUB/PDF、搜索、书签、笔记、账号和同步功能。

## 打包

Windows 安装包可以通过以下命令生成：

```bash
npm run dist
```
