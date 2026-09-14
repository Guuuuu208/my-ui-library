# 精选源码安全审查

## 摘要

本批次收录 14 个未归档的官方 GitHub 项目，共 7,848 个文件、约 14.99 MiB。13 个项目为 MIT 许可证，Lucide 为 ISC。所有来源固定到具体提交哈希，原始文件未改写。

收录期间没有运行依赖安装、构建、测试或第三方脚本。静态筛选未发现可执行文件、npm 安装生命周期脚本、动态代码执行、进程执行、私钥、AWS 访问密钥或 GitHub 令牌。Windows Defender 自定义扫描结果为“found no threats”。

## 高危与中危

未发现。

## 低危使用注意

### SRC-001：Embla 无障碍文本存在 HTML 写入点

- 规则：REACT-DOM-001
- 位置：`vendor/curated/embla-carousel/packages/embla-carousel-accessibility/src/components/Accessibility.ts:291`
- 证据：`liveRegionNode.innerHTML = label`
- 影响：`label` 来自可配置回调。如果接入者把未经处理的用户内容放进该回调，可能形成 DOM XSS；默认实现只生成固定格式的数字说明。
- 使用要求：只传可信静态文本。若业务必须包含用户内容，在项目副本中改用 `textContent` 或先做可靠净化；不要改动资料库中的上游原件。
- 误报说明：默认配置不接收网络或用户输入，因此不是当前资料库中的可利用漏洞，也不是恶意行为。

### SRC-002：shadcn/ui 图表样式存在动态 CSS 写入点

- 规则：REACT-XSS-001
- 位置：`vendor/curated/shadcn-ui/apps/v4/registry/new-york-v4/ui/chart.tsx:94`
- 证据：通过 `dangerouslySetInnerHTML` 写入由 `id`、主题键和颜色配置拼接的 CSS。
- 影响：如果把用户可控字符串直接作为图表 `id`、配置键或颜色值，可能发生 CSS 注入。
- 使用要求：这些值只允许来自开发者定义的配置；接收外部数据时应使用严格的标识符与 CSS 颜色白名单。
- 误报说明：常规用法中的配置写在源码内，不是当前资料库中的可利用漏洞，也不是恶意行为。

## 已核实的静态信号

- Radix Primitives 的两个 `dangerouslySetInnerHTML` 位置只写入固定的隐藏滚动条 CSS，并支持 CSP nonce；没有拼接外部数据。
- Recharts 命中的多数文本是 TypeScript 属性排除或类型声明，不是 HTML 执行点。
- 原上游示例中会从 CDN 加载脚本的 HTML 入口没有收录；TanStack Table 的远程性能调试示例目录也已排除。

## 限制

这是源码入库检查，不等于对 14 个项目及其未来依赖做完整渗透测试。资料库中的代码尚未统一安装和运行；真正接入网站时，需要再根据传入数据、依赖版本和部署策略进行项目级审查。

