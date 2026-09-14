import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'effects/fancy/manifest.json'),'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
const curatedIndex = JSON.parse(fs.readFileSync(path.join(root,'sources/index.json'),'utf8'));
const hash = (algorithm, data) => crypto.createHash(algorithm).update(data).digest('hex');
const errors = [];
for (const item of manifest.files) {
  const target = path.resolve(root,'vendor/fancy',item.path);
  if (!target.startsWith(path.resolve(root,'vendor/fancy') + path.sep)) throw Error('Invalid manifest path');
  if (!fs.existsSync(target)) { errors.push(`Missing: ${item.path}`); continue; }
  const bytes = fs.readFileSync(target);
  const blob = hash('sha1', Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes]));
  if (bytes.length !== item.bytes || hash('sha256',bytes) !== item.sha256 || blob !== item.blob) errors.push(`Changed: ${item.path}`);
}
let curatedFileCount = 0;
for (const source of curatedIndex.sources) {
  const sourceRoot = path.resolve(root,source.sourcePath);
  const manifestPath = path.resolve(root,source.manifestPath);
  if (!sourceRoot.startsWith(path.resolve(root,'vendor/curated') + path.sep)) throw Error('Invalid curated source path');
  if (!manifestPath.startsWith(path.resolve(root,'sources/manifests') + path.sep)) throw Error('Invalid curated manifest path');
  if (!fs.existsSync(manifestPath)) { errors.push(`Missing manifest: ${source.manifestPath}`); continue; }
  const sourceManifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  curatedFileCount += sourceManifest.files.length;
  const expectedPaths = new Set(sourceManifest.files.map(item=>item.path));
  for (const item of sourceManifest.files) {
    const target = path.resolve(sourceRoot,item.path);
    if (!target.startsWith(sourceRoot + path.sep)) throw Error('Invalid curated manifest item path');
    if (!fs.existsSync(target)) { errors.push(`Missing: ${source.id}/${item.path}`); continue; }
    const bytes = fs.readFileSync(target);
    if (bytes.length !== item.bytes || hash('sha256',bytes) !== item.sha256) errors.push(`Changed: ${source.id}/${item.path}`);
  }
  const actualFiles = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory,{withFileTypes:true})) {
      const target = path.join(directory,entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile()) actualFiles.push(path.relative(sourceRoot,target).replaceAll('\\','/'));
      else errors.push(`Unsupported entry: ${source.id}/${path.relative(sourceRoot,target)}`);
    }
  };
  visit(sourceRoot);
  for (const relative of actualFiles) if (!expectedPaths.has(relative)) errors.push(`Untracked file: ${source.id}/${relative}`);
}
const ids = new Set();
for (const entry of catalog.entries) {
  if (ids.has(entry.id)) errors.push(`Duplicate: ${entry.id}`);
  ids.add(entry.id);
  for (const relative of [entry.sourcePath,entry.analysisPath,...(entry.examples||[]),...(entry.docs||[]).map(d=>d.path),...(entry.dependencies?.files||[]).map(f=>'vendor/fancy/'+f)]) {
    if (relative && !fs.existsSync(path.join(root,relative))) errors.push(`Broken index path: ${relative}`);
  }
}
if (errors.length) {console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${manifest.files.length} Fancy files and ${curatedFileCount} curated-source files unchanged; ${catalog.entries.length} component entries and indexed paths valid. Runtime/visual checks not performed.`);
