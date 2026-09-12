// Export upstream Git blobs unchanged; generate analysis outside vendor/.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upstream = path.join(root, '.local/fancy-upstream');
const revision = 'f9f62c61207b2dd3210476dd98af3c9a5be24094';
const vendor = path.join(root, 'vendor/fancy');
const git = (...args) => execFileSync('git', args, { cwd: upstream, maxBuffer: 40 * 1024 * 1024 });
if (git('rev-parse', 'HEAD').toString().trim() !== revision) throw Error('Unexpected upstream revision');
const selections = ['src', 'LICENSE', 'README.md', 'package.json', 'package-lock.json', 'tsconfig.json', 'components.json', 'next.config.js', 'postcss.config.mjs', 'prettier.config.cjs'];
const tree = git('ls-tree', '-r', revision, '--', ...selections).toString().trim().split('\n').filter(Boolean).map(line => {
  const match = line.match(/^(\d+) blob ([a-f0-9]+)\t(.+)$/);
  if (!match || !['100644', '100755'].includes(match[1])) throw Error('Unsupported upstream tree entry');
  return { blob: match[2], path: match[3] };
});
const hash = (algorithm, data) => crypto.createHash(algorithm).update(data).digest('hex');
const blobHash = data => hash('sha1', Buffer.concat([Buffer.from(`blob ${data.length}\0`), data]));
const write = (relative, content) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, relative.endsWith('.md') ? content.trimEnd() + '\n' : content);
};
const json = value => JSON.stringify(value, null, 2) + '\n';
const archive = path.join(root, '.local/fancy-original.tar');
if (!fs.existsSync(path.join(root, 'effects/fancy/manifest.json'))) {
  // Windows Git may have converted line endings in an interrupted first export.
  // Only repair files that still match upstream after CRLF normalization.
  for (const entry of tree) {
    const target = path.join(vendor, entry.path);
    if (fs.existsSync(target)) {
      const data = fs.readFileSync(target);
      if (blobHash(data) !== entry.blob && blobHash(Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'))) !== entry.blob) throw Error(`Refusing to overwrite changed file: ${entry.path}`);
    }
  }
  fs.mkdirSync(vendor, { recursive: true });
  git('-c', 'core.autocrlf=false', 'archive', '--format=tar', `--output=${archive}`, revision, ...selections);
  execFileSync('tar', ['-xf', archive, '-C', vendor]);
}
const manifest = tree.map(entry => {
  const data = fs.readFileSync(path.join(vendor, entry.path));
  if (blobHash(data) !== entry.blob) throw Error(`Original differs: ${entry.path}`);
  return { ...entry, bytes: data.length, sha256: hash('sha256', data) };
});
const allFiles = new Set(tree.map(x => x.path));
const text = file => fs.readFileSync(path.join(vendor, file), 'utf8');
const packageData = JSON.parse(text('package.json'));
const imports = file => [...text(file).matchAll(/(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*["']([^"']+)["']/g)].map(m => m[1]);
function resolveLocal(file, spec) {
  const base = spec.startsWith('@/') ? `src/${spec.slice(2)}` : spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)) : null;
  if (!base) return null;
  return [base, ...['.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx'].map(ext => base + ext)].find(x => allFiles.has(x)) || `UNRESOLVED:${base}`;
}
function closure(start) {
  const seen = new Set(); const packages = new Set(); const missing = new Set();
  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    if (!/\.[jt]sx?$/.test(file)) return;
    for (const spec of imports(file)) {
      const local = resolveLocal(file, spec);
      if (local?.startsWith('UNRESOLVED:')) missing.add(local.slice(11));
      else if (local) visit(local);
      else packages.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
    }
  }
  visit(start);
  return { files: [...seen].sort(), packages: [...packages].sort().map(name => ({name, declaredVersion: packageData.dependencies?.[name] || packageData.devDependencies?.[name] || null})), unresolved: [...missing] };
}
const docs = [...allFiles].filter(x => x.startsWith('src/content/docs/components/') && x.endsWith('.mdx')).map(file => {
  const source = text(file);
  return { file, title: source.match(/^title:\s*(.+)$/m)?.[1].trim(), description: source.match(/^description:\s*(.+)$/m)?.[1].trim(), components: [...source.matchAll(/<ComponentSource[^>]*name="([^"]+)"/g)].map(m => m[1]), demos: [...source.matchAll(/<ComponentPreview[^>]*name="([^"]+)"/g)].map(m => m[1]) };
});
const exampleFiles = [...allFiles].filter(x => x.startsWith('src/fancy/examples/') && x.endsWith('.tsx'));
const componentFiles = [...allFiles].filter(x => x.startsWith('src/fancy/components/') && x.endsWith('.tsx'));
const categories = {text:'文字特效', blocks:'交互区块', background:'背景效果', physics:'物理交互', image:'图片动效', filter:'SVG 滤镜', carousel:'轮播'};
const entries = componentFiles.map(file => {
  const slug = path.posix.basename(file, '.tsx');
  const category = file.split('/')[3];
  const source = text(file);
  const matchingDocs = docs.filter(d => d.components.includes(slug));
  const examples = exampleFiles.filter(e => imports(e).some(s => resolveLocal(e, s) === file));
  const dependencies = closure(file);
  const sourceLines = source.split('\n');
  const signals = [];
  const checks = [
    ['hover', /onHoverStart|onMouseEnter/], ['pointer', /onPointer|mousemove|useMouse/],
    ['scroll', /useScroll|useInView|scrollY|IntersectionObserver/], ['frame-loop', /useAnimationFrame|requestAnimationFrame|Runner\.run/],
    ['variable-font', /fontVariationSettings/], ['physics', /matter-js/], ['svg-filter', /<filter|<fe[A-Z]/],
    ['reduced-motion-mention', /useReducedMotion|prefers-reduced-motion/], ['accessible-text', /sr-only|aria-label|aria-hidden/]
  ];
  for (const [signal, regex] of checks) { const line = sourceLines.findIndex(s => regex.test(s)); if (line >= 0) signals.push({signal, line:line+1}); }
  const notes = [];
  if (!signals.some(x => x.signal === 'reduced-motion-mention')) notes.push('该文件未检出减少动态效果设置；这只是静态检索结果，不代表整个应用没有全局处理。');
  if (signals.some(x => ['hover', 'pointer'].includes(x.signal))) notes.push('鼠标或悬停触发：实际接入前验证触屏和键盘，不默认视为手机适配完成。');
  if (signals.some(x => x.signal === 'variable-font')) notes.push('依赖合适的可变字体与字体轴；原站字体文件本次未收录。');
  if (signals.some(x => ['physics', 'frame-loop'].includes(x.signal))) notes.push('包含持续更新或物理计算；接入前验证性能、离屏暂停及卸载清理。');
  if (matchingDocs.some(d => /Safari/i.test(text(d.file)))) notes.push('原始文档包含 Safari 兼容性说明，接入前阅读对应文档。');
  const id = `fancy-${slug}`;
  return {id, name: slug, kind:'effect', category, categoryLabel: categories[category], implementation:'upstream', status:'source-verified-runtime-untested', sourcePath:`vendor/fancy/${file}`, analysisPath:`effects/fancy/items/${slug}.md`, docs:matchingDocs.map(d => ({title:d.title, path:`vendor/fancy/${d.file}`, url:`https://www.fancycomponents.dev/${d.file.replace('src/content/', '').replace(/\.mdx$/, '')}`})), examples: examples.map(e => `vendor/fancy/${e}`), dependencies, signals, notes, source:{repository:'https://github.com/danielpetho/fancy', revision, license:'MIT'}, preference:{rating:null,likes:[],dislikes:[]}};
});
write('effects/fancy/manifest.json', json({revision, repository:'https://github.com/danielpetho/fancy', importedFiles:manifest.length, components:entries.length, examples:exampleFiles.length, docs:docs.length, omitted:['public/fonts','public/favicon*','public/og.jpg','other public branding assets'], files:manifest}));
write('effects/fancy/index.json', json({schemaVersion:1, method:'Static import graph and source-pattern inspection; no runtime certification.', entries, documentationPages:docs}));
for (const entry of entries) {
  const source = entry.sourcePath.replace('vendor/fancy/', '');
  write(entry.analysisPath, `# ${entry.name}\n\n分类：${entry.categoryLabel}。原始源码未改动；尚未运行验收。\n\n## 原文件\n\n- [组件源码](../../../${entry.sourcePath})\n- [许可证](../../../vendor/fancy/LICENSE)\n- 上游版本：\`${revision}\`\n\n## 源码结构\n\n直接导入：${imports(source).map(x=>'`'+x+'`').join('、') || '无'}。\n\n静态特征（行号对应原文件）：\n\n${entry.signals.map(x=>`- ${x.signal}：第 ${x.line} 行。`).join('\n') || '- 未检出预设特征。'}\n\n## 完整本地依赖链\n\n${entry.dependencies.files.map(x=>`- [${x}](../../../vendor/fancy/${x})`).join('\n')}\n\n外部包：${entry.dependencies.packages.map(x=>'`'+x.name+' '+(x.declaredVersion||'版本待确认')+'`').join('、') || '无'}。这不是建议升级版本；锁定版本见原始 package-lock.json。\n\n## 官方文档与用法\n\n${entry.docs.map(d=>`- [${d.title}](../../../${d.path}) / [原站](${d.url})`).join('\n') || '- 未通过 ComponentSource 标签找到专属文档；不可冒称已正式发布。'}\n${entry.examples.map(e=>`- [原始示例](../../../${e})`).join('\n')}\n\n## 接入注意\n\n- 保留组件 API、默认值、样式与动画；需要改动时先说明并取得用户指示。\n- React / TypeScript / Tailwind 环境与 @/ 别名需要匹配。请连同上面的本地依赖链使用，不能只拿单文件。\n${entry.notes.map(n=>'- '+n).join('\n')}\n${entry.dependencies.unresolved.length ? '\n未解析依赖：'+entry.dependencies.unresolved.join('、') : ''}\n`);
}
const summary = Object.fromEntries(Object.keys(categories).map(c=>[c,entries.filter(e=>e.category===c).length]));
write('effects/fancy/README.md', `# Fancy Components 原始特效库\n\n已收录 ${entries.length} 个 TSX 组件、${exampleFiles.length} 个原始示例、${docs.length} 篇组件文档。${manifest.length} 个源文件已按 Git blob 校验完全一致，没有修改原始代码。\n\n[上游仓库](https://github.com/danielpetho/fancy) · [MIT 许可证](../../vendor/fancy/LICENSE) · [完整索引](index.json) · [逐文件校验清单](manifest.json) · [重点分析](../../analysis/fancy-source-analysis.md)\n\n这是固定版本源码档案，不是已完成视觉验收的独立组件安装包。未执行上游构建脚本，未导入字体文件及品牌图片。文档中的 Sticky Footer 是演示而非独立组件；原始示例已保留。\n\n| 分类 | 组件数 |\n| --- | --- |\n${Object.entries(summary).map(([c,n])=>`| ${categories[c]} | ${n} |`).join('\n')}\n\n## 按组件查找\n\n| 名称 | 分类 | 分析 | 原始源码 |\n| --- | --- | --- | --- |\n${entries.map(e=>`| ${e.name} | ${e.categoryLabel} | [拆解](items/${e.name}.md) | [源码](../../${e.sourcePath}) |`).join('\n')}\n`);
const catalogPath = path.join(root, 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
catalog.entries = [...catalog.entries.filter(e => !e.id.startsWith('fancy-')), ...entries];
write('catalog.json', json(catalog));
console.log(json({files:manifest.length,components:entries.length,examples:exampleFiles.length,docs:docs.length,categories:summary,unresolved:entries.filter(e=>e.dependencies.unresolved.length).map(e=>({id:e.id,paths:e.dependencies.unresolved})),verification:'Git blob hashes match original revision'}));
