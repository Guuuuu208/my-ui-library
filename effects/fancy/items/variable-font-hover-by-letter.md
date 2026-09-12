# variable-font-hover-by-letter

分类：文字特效。原始源码未改动；尚未运行验收。

## 原文件

- [组件源码](../../../vendor/fancy/src/fancy/components/text/variable-font-hover-by-letter.tsx)
- [许可证](../../../vendor/fancy/LICENSE)
- 上游版本：`f9f62c61207b2dd3210476dd98af3c9a5be24094`

## 源码结构

直接导入：`react`、`lodash`、`motion/react`。

静态特征（行号对应原文件）：

- hover：第 74 行。
- variable-font：第 49 行。
- accessible-text：第 80 行。

## 完整本地依赖链

- [src/fancy/components/text/variable-font-hover-by-letter.tsx](../../../vendor/fancy/src/fancy/components/text/variable-font-hover-by-letter.tsx)

外部包：`lodash ^4.17.21`、`motion ^12.23.24`、`react ^19.2.1`。这不是建议升级版本；锁定版本见原始 package-lock.json。

## 官方文档与用法

- [Variable Font Hover By Letter](../../../vendor/fancy/src/content/docs/components/text/variable-font-hover-by-letter.mdx) / [原站](https://www.fancycomponents.dev/docs/components/text/variable-font-hover-by-letter)
- [原始示例](../../../vendor/fancy/src/fancy/examples/text/variable-font-hover-by-letter-demo.tsx)

## 接入注意

- 保留组件 API、默认值、样式与动画；需要改动时先说明并取得用户指示。
- React / TypeScript / Tailwind 环境与 @/ 别名需要匹配。请连同上面的本地依赖链使用，不能只拿单文件。
- 该文件未检出减少动态效果设置；这只是静态检索结果，不代表整个应用没有全局处理。
- 鼠标或悬停触发：实际接入前验证触屏和键盘，不默认视为手机适配完成。
- 依赖合适的可变字体与字体轴；原站字体文件本次未收录。
