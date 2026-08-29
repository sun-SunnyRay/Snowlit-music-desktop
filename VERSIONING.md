# 桌面版版本号

显示版本由 `versionCode` 算出，不手改 `version` 的个位。

```
version = {floor(versionCode / 10)}.{versionCode % 10}.0
```

末位固定为 0。中间位到 9 再加一，进到前面那位，中间归 0。

| versionCode | version |
| --- | --- |
| 87 | 8.7.0 |
| 88 | 8.8.0 |
| 89 | 8.9.0 |
| 90 | 9.0.0 |
| 99 | 9.9.0 |
| 100 | 10.0.0 |

当前：`versionCode` **89**，`version` **8.9.0**。下一发先跑 `npm run bump-version`（90 → 9.0.0）。

覆盖安装认单调递增的 `versionCode`（打进 electron-builder 的 `buildVersion`），不认第三位。

每次打包前必须先加一，禁止用上次的号再打一包。安装包不进 git。
