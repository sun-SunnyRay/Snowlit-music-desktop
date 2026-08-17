# 版本约定（映雪音乐 · 桌面版）

## 当前

| 字段 | 值 |
|------|-----|
| `package.json` version | **6.0.20** |
| productName | snowlitmusic-desktop |
| 显示名 | 映雪音乐 / Snowlit Music |
| appId | `cn.snowlit.music.desktop`（独立配置目录，不与官方洛雪混用） |
| 产物示例 | `snowlitmusic-desktop-v6.0.20-x64-Setup.exe` |

与手机版 **version 号可对齐**（同为映雪产品线），桌面版 **不含** 融合音源 / 调度引擎。

## 范围

- **做**：贴牌、图标、关于/协议文案、独立 appId、导入社区音源（原生 userApi）
- **不做**：source-engine、builtin 融合源、引擎内音质阶梯

## 发版

1. 升 `package.json` 的 `version`
2. `npm run pack` 或 `npm run pack:win:setup:x64`
3. 安装包输出目录：`build/`
