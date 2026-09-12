# Fancy Components 源码拆解

分析基于固定提交 `f9f62c61207b2dd3210476dd98af3c9a5be24094`，不是根据截图猜实现。原始文件位于 [vendor/fancy](../vendor/fancy/README.md)，分析没有写入或改造上游源码。

## 已保存的内容

45 个 TSX 组件、99 个 TSX 演示、40 篇组件 MDX 文档，以及共享 hooks、工具函数、原始样式、项目配置和锁文件；共 285 个原始文件。逐文件 Git blob 校验通过。MIT 许可证和 Daniel Petho 的署名原样保留。

组件数和文档数不同：一个文档可能对应多个动画变体；Sticky Footer 只有演示代码；部分组件没有独立的公开文档。索引不将这些情况合并成一个虚假的数量。

## 结构与复用边界

| 上游路径 | 作用 | 怎么使用 |
| --- | --- | --- |
| src/fancy/components/ | 文字、区块、背景、物理、图像、滤镜和轮播实现 | 按索引选择具体组件 |
| src/fancy/examples/ | 作者的组合方式、参数、布局与样式 | 保留原始演示，核对字体、外部素材和容器尺寸 |
| src/content/docs/components/ | 安装、参数、原理与兼容性说明 | 与源码交叉核对，不假设表格默认值完全同步 |
| src/hooks/、src/utils/、src/lib/ | 指针、尺寸、路径、类名合并等依赖 | 连同组件的依赖链使用 |
| src/app/globals.css | 原站主题、字体与样式定义 | 是设计效果的部分依赖，不能只复制 JSX 就保证一致 |
| src/scripts/ | 文档站和安装数据的构建脚本 | 原样归档，本次未运行 |
| package.json、package-lock.json | 原站完整开发环境与锁定依赖 | 供版本核对，不代表每个组件都需要整个文档站的依赖 |

依赖索引递归解析源码中的静态导入，记录每个组件需要的本地文件和外部包。本次 45 项组件的这类本地导入均可解析。它不覆盖所有动态路径、CSS 内字体、运行时网络资源或组件组合时的隐含样式。

`src/scripts/build-registry-sources.ts` 会重写 `@/fancy/...` 导入路径，也包含将命名颜色替换为色值和调整容器尺寸的逻辑。因此本库采用 Git 原始文件，不把运行该脚本生成的结果冒充未修改源码。

## Random Letter Swap：与你截图对应的效果

源码：[Forward](../vendor/fancy/src/fancy/components/text/random-letter-swap-forward-anim.tsx)、[Ping Pong](../vendor/fancy/src/fancy/components/text/random-letter-swap-pingpong-anim.tsx)；[作者演示](../vendor/fancy/src/fancy/examples/text/random-letter-swap-demo.tsx)。

1. 为每个字符创建上下两份文本，外层裁切溢出；不是改变整个单词的内容。
2. 生成随机字符序列，用 `i * staggerDuration` 给每个字符错开动画。
3. Motion 的 `useAnimate()` 同时驱动主字符的 `y` 和副字符的 `top`。
4. Forward 完成一次置换后立即复位；Ping Pong 在移出时动画返回原位置。
5. Lodash 的 debounce 与 blocked 状态共同限制快速触发；`sr-only` 文本与 `aria-hidden` 避免把两份视觉字符重复读出。

### 源码与文档差异

| 参数 | 原始源码默认值 | 文档表格 |
| --- | --- | --- |
| transition.duration | 0.8 | 0.7 |
| staggerDuration | 0.02 | 0.03 |

分析以代码实际默认值为准；两种文件均保持原样，没有替作者“修正文档”。原始演示带有 `font-overused-grotesk`、字号、红色和留白等样式。只复制动画函数不能自动获得截图中的排版。

### 已发现的接入限制，未修复

- 文字通过 `label.split("")` 拆分；包含代理对或组合字符的 emoji 等内容需要单独验证。
- 最外层是可点击的 span；不能只因传入 onClick 就把它当成完整的键盘可操作按钮。
- 文件没有自带减少动态效果的处理；不能把该组件直接标成满足所有无障碍要求。
- 主要通过 hover 触发，触屏表现尚未实测。
- 同时更新 top 和 transform；性能尚未测量，不能声称已稳定达到某个帧率。
- debounce 在渲染中创建，文件未看到对应取消清理；快速反复悬停、卸载及动态换文案需要验证。

## 其他类别的实现拆解

| 类别 | 从源码/原文档检出的实现方式 | 复用前要核对 |
| --- | --- | --- |
| 文字 | 字符拆分、位移、遮罩、乱序、fontVariationSettings | 中文/emoji、可变字体轴、换行、hover/键盘 |
| 交互区块 | Motion、逐帧更新、拖拽、SVG 路径及布局关系 | 容器尺寸、指针捕获、滚动容器、重复内容 |
| 物理 | Matter.js 引擎、刚体与 DOM 元素同步，共享工具处理位置和路径 | 子元素尺寸、清理、resize、计算负担 |
| 图片 | 指针位置和距离驱动媒体排列、视差或轨迹 | 素材本身、触屏、加载后的尺寸 |
| 滤镜 | SVG 滤镜定义和图像处理 primitive | 作者明确记录了 Safari 限制；不能当作通用跨浏览器效果 |
| 轮播 | 三维旋转和拖动；Box Carousel 文件包含 useReducedMotion | 仍需验证实际焦点、触屏、内容尺寸 |
| 背景 | SVG 动画或指针驱动的像素网格 | 效果层大小、资源负担和移动端实际表现 |

Simple Marquee 的源码不是简单 CSS 平移：它使用 Motion motion value、逐帧循环、滚动速度、弹簧平滑和可选拖拽来控制位移；复制的重复项设置了 aria-hidden。悬停减速参数默认关闭，原文件未检出减少动态效果设置。它也保持原样。

## “直接拿来用”的准确范围

现在可以直接找到原始组件、作者用法、参数、共享依赖和许可。接入 React / TypeScript / Tailwind 项目时，必须匹配依赖和 `@/` 路径别名；需要改变文件、样式或结构时应先说明差异，不能默默改造。

本次没有复制 public/fonts 和原站品牌图标，字体许可需单独核对；演示内的远程素材也不等于已取得再分发权。本次没有安装并运行整套原站，因此未提供桌面/手机视觉验收，也未标为生产可用。

[逐组件分析目录](../effects/fancy/README.md) · [依赖与文档索引](../effects/fancy/index.json)
