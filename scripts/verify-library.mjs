import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'effects/fancy/manifest.json'),'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
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
const ids = new Set();
for (const entry of catalog.entries) {
  if (ids.has(entry.id)) errors.push(`Duplicate: ${entry.id}`);
  ids.add(entry.id);
  for (const relative of [entry.sourcePath,entry.analysisPath,...(entry.examples||[]),...(entry.docs||[]).map(d=>d.path),...(entry.dependencies?.files||[]).map(f=>'vendor/fancy/'+f)]) {
    if (relative && !fs.existsSync(path.join(root,relative))) errors.push(`Broken index path: ${relative}`);
  }
}
if (errors.length) {console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${manifest.files.length} upstream files unchanged; ${catalog.entries.length} component entries and indexed paths valid. Runtime/visual checks not performed.`);
