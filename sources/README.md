# 精选前端源码

这里保存的是可直接检索和复用的第三方原始源码，不是 npm 安装目录，也不是改写版组件。每个来源固定到 40 位提交哈希，保留原许可证，并有逐文件 SHA-256 清单。

## 已覆盖的分类

| 分类 | 来源 | 主要用途 |
| --- | --- | --- |
| 无障碍底层组件 | Radix Primitives | 对话框、菜单、选择器、浮层等行为基础 |
| 成品组件与页面区块 | shadcn/ui | 表单、导航、侧栏、登录页、仪表盘等可复制 React/Tailwind 源码 |
| 数据表格 | TanStack Table | 排序、筛选、分页、选择、固定列和大数据表格示例 |
| 长列表性能 | TanStack Virtual | 虚拟列表、虚拟网格和无限滚动 |
| 表单 | React Hook Form | 表单状态、验证、字段数组和 TypeScript 示例 |
| 图表 | Recharts | 折线、柱状、面积、饼图、散点和组合图 |
| 图标 | Lucide | React 图标组件、原始 SVG 和分类数据 |
| 拖拽 | dnd kit | 排序、碰撞检测、拖放传感器和无障碍拖拽 |
| 轮播 | Embla Carousel | React 轮播及自动播放、淡入淡出、无障碍插件 |
| 浮层定位 | Floating UI | Tooltip、Popover、Dropdown 等定位逻辑 |
| 命令面板 | cmdk | 搜索式命令菜单 |
| 通知 | Sonner | Toast 通知 |
| 日期选择 | React DayPicker | 日历和日期范围选择 |
| 富文本编辑器 | Lexical | 文本编辑、列表、链接、表格、Markdown 和 React 适配 |

## 怎么找和使用

先查 [`index.json`](index.json) 的 `category`，再打开对应 `sourcePath`。每个项目的固定版本、许可证、文件哈希和静态扫描结果都在 [`manifests/`](manifests/) 中。

接入网站时，只复制实际需要的文件并阅读该来源的 README 和许可证。不同来源的状态模型与样式方式不同，不能把整套目录不加选择地混进一个项目。

运行 `node scripts/verify-library.mjs` 可离线核对全部已收录源码是否缺失或被修改，不会执行第三方代码。

## 安全边界

- 只从 `github.com` 官方项目页与 `codeload.github.com` 官方归档下载。
- 没有运行 `npm install`、构建命令或任何第三方脚本。
- 已排除测试目录、可执行文件、安装生命周期脚本和会直接加载远程脚本的 HTML 示例入口。
- Windows Defender 对 `vendor/curated/` 的自定义扫描未发现威胁。
- 静态扫描与杀毒软件不能提供绝对零风险保证；接入具体项目时仍需按实际数据来源审查 HTML/CSS 注入点。

