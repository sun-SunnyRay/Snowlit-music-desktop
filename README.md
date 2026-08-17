# Snowlit Music · 桌面版

- 显示名：映雪音乐 / Snowlit Music
- 包名：`snowlitmusic-desktop`，当前版本见 `package.json`（6.0.27）
- appId：`cn.snowlit.music.desktop`
- 产物示例：`build/snowlitmusic-desktop-v6.0.27-x64-Setup.exe`

播放要先到「设置 → 自定义源」自行在线或本地导入音源。仓库不附带音源脚本，也不附带导入链接清单。

## 开发

需要 Node ≥ 22。Windows 本机编译 native 模块时还要 Visual Studio 2022 Build Tools。

```bash
cd D:\work\XueMusic-desktop
npm install
npm run dev
```

或用仓库里的脚本（会先加载 vcvars64）：

```bat
dev-with-vs.bat
```

## 打包

```bash
npm run pack:win:setup:x64
```

安装包在 `build/`。默认关闭自动更新。

Windows 配置大致在 `%APPDATA%/snowlitmusic-desktop`。

## License

Apache-2.0（协议正文见应用内许可协议）
