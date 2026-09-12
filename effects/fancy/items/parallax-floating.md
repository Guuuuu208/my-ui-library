# parallax-floating

分类：图片动效。原始源码未改动；尚未运行验收。

## 原文件

- [组件源码](../../../vendor/fancy/src/fancy/components/image/parallax-floating.tsx)
- [许可证](../../../vendor/fancy/LICENSE)
- 上游版本：`f9f62c61207b2dd3210476dd98af3c9a5be24094`

## 源码结构

直接导入：`react`、`motion/react`、`@/lib/utils`、`@/hooks/use-mouse-position-ref`。

静态特征（行号对应原文件）：

- pointer：第 14 行。
- frame-loop：第 11 行。

## 完整本地依赖链

- [src/fancy/components/image/parallax-floating.tsx](../../../vendor/fancy/src/fancy/components/image/parallax-floating.tsx)
- [src/hooks/use-mouse-position-ref.ts](../../../vendor/fancy/src/hooks/use-mouse-position-ref.ts)
- [src/lib/utils.ts](../../../vendor/fancy/src/lib/utils.ts)

外部包：`clsx ^2.1.1`、`motion ^12.23.24`、`react ^19.2.1`、`tailwind-merge ^2.3.0`。这不是建议升级版本；锁定版本见原始 package-lock.json。

## 官方文档与用法

- [Parallax Floating](../../../vendor/fancy/src/content/docs/components/image/parallax-floating.mdx) / [原站](https://www.fancycomponents.dev/docs/components/image/parallax-floating)
- [原始示例](../../../vendor/fancy/src/fancy/examples/image/parallax-floating-demo.tsx)

## 接入注意

- 保留组件 API、默认值、样式与动画；需要改动时先说明并取得用户指示。
- React / TypeScript / Tailwind 环境与 @/ 别名需要匹配。请连同上面的本地依赖链使用，不能只拿单文件。
- 该文件未检出减少动态效果设置；这只是静态检索结果，不代表整个应用没有全局处理。
- 鼠标或悬停触发：实际接入前验证触屏和键盘，不默认视为手机适配完成。
- 包含持续更新或物理计算；接入前验证性能、离屏暂停及卸载清理。
