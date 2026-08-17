# 映雪音乐 桌面版（Snowlit Music Desktop）

基于 [lyswhut/lx-music-desktop](https://github.com/lyswhut/lx-music-desktop) 的本地发行贴牌版。

## 和手机版的区别

| | 手机映雪 | 桌面映雪 |
|--|----------|----------|
| 融合调度音源 | 可选内置 | **不做** |
| 社区导入源 | 支持 | **主路径** |
| 音质 | 原生选档 + 换源（导入源时） | **仅原生** |
| UI 跟手 | tokens / 按压 / 列表 | **已做**（动效缩短 + 按压反馈，不改布局） |

## UI / 动画优化（已落地）

- 全局 transition：`0.6/0.4/0.3s` → 约 `0.36/0.22/0.16s`（缓动更跟手）
- 入场动画：`.animated` 0.5s → 0.28s；`.animated-fast` 0.18s
- 列表行 / 按钮 / 导航 / 播放栏：按下轻微缩放
- 弹窗默认 `zoomIn` 快进场（随机动画仍可用）
- 封面圆角 `@radius-pic: 6px`

不改页面结构、不改取链。

## 开发

```bash
cd D:\XueMusic\desktop\XueMusic-desktop
npm install
npm run dev
```

需要：

- Node ≥ 22  
- **Visual Studio 2022 Build Tools**（已可本机安装：含 VCTools；不是 VS Code）  

开发 / 打包（建议用 VS 环境）：

```bat
:: 仓库内快捷脚本（会先加载 vcvars64）
dev-with-vs.bat
dev-with-vs.bat npm run pack:win:setup:x64
```

或手动：

```bat
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cd /d D:\XueMusic\desktop\XueMusic-desktop
npm run dev
npm run pack:win:setup:x64
```

安装包产物示例：`build\snowlitmusic-desktop-v6.0.20-x64-Setup.exe`

## 打包（Windows x64 安装包）

```bash
npm run pack:win:setup:x64
```

产物：`build/snowlitmusic-desktop-v*.exe` 一类。

## 使用：导入音源

1. 设置 → **自定义源** → 在线导入  
2. 粘贴 raw 链接（见桌面 `YingXue-LX-Source-Import-Links.md` 或手机同款列表）  
3. 启用其中一个源后搜歌播放  

音质在 **设置 → 播放设置 → 优先播放的音质**（默认已改为 320k）。失败后走原生换源，无融合降级。

## 数据目录

`appId` 为 `cn.snowlit.music.desktop`，Windows 配置大致在：

`%APPDATA%/snowlitmusic-desktop`

与官方 `lx-music-desktop` **分离**，互不影响歌单（不会自动迁移）。

## 自动更新

默认 **关闭** `tryAutoUpdate`，且构建 `publish` 已置空，避免误从官方 LX 仓库拉更新。
