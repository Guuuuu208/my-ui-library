import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "sources", "curated-sources.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const extractedRoot = path.join(root, ".local", "extracted");
const archivesRoot = path.join(root, ".local", "archives");
const vendorRoot = path.join(root, "vendor", "curated");
const manifestsRoot = path.join(root, "sources", "manifests");
const allowedLicenses = new Set(config.policy.allowedLicenses);
const forbiddenExtensions = new Set([
  ".exe", ".dll", ".com", ".msi", ".scr", ".pif", ".jar", ".apk", ".dmg",
  ".pkg", ".deb", ".rpm", ".appx", ".appxbundle", ".ps1", ".bat", ".cmd",
  ".vbs", ".reg", ".lnk"
]);
const textExtensions = new Set([
  ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".css", ".scss", ".md",
  ".mdx", ".json", ".html", ".svg", ".yml", ".yaml", ".txt"
]);
const signalPatterns = [
  ["dynamic-code", /\beval\s*\(|\bnew\s+Function\s*\(/g],
  ["process-execution", /from\s+["']node:child_process["']|require\s*\(\s*["']child_process["']\s*\)|\bexecSync\s*\(|\bspawnSync\s*\(/g],
  ["html-injection", /dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML\s*\(/g],
  ["remote-script", /createElement\s*\(\s*["']script["']\s*\)|<script[^>]+src=["']https?:/g],
  ["embedded-private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g]
];

function assertSafeRelative(relative) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) {
    throw new Error(`Unsafe path: ${relative}`);
  }
}

function makeCopyFilter(source, localRoot) {
  const excludes = (source.excludes ?? []).map((item) => item.replaceAll("\\", "/"));
  return async (sourcePath) => {
    const normalized = sourcePath.replaceAll("\\", "/");
    const relative = path.relative(localRoot, sourcePath).replaceAll("\\", "/");
    if (/(^|\/)(test|tests|__tests__|__snapshots__)(\/|$)/i.test(normalized)) return false;
    if (/\.(test|spec)\.[^/]+$/i.test(normalized) || /\.snap$/i.test(normalized)) return false;
    if (excludes.some((item) => relative === item || relative.startsWith(`${item}/`))) return false;
    if (path.extname(sourcePath).toLowerCase() === ".html") {
      const fileStat = await stat(sourcePath);
      if (fileStat.isFile()) {
        const content = await readFile(sourcePath, "utf8");
        if (/<script[^>]+src=["']https?:/i.test(content)) return false;
      }
    }
    return true;
  };
}

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(absolute));
    else if (entry.isFile()) output.push(absolute);
    else throw new Error(`Unsupported filesystem entry: ${absolute}`);
  }
  return output;
}

async function sha256(file) {
  const bytes = await readFile(file);
  return createHash("sha256").update(bytes).digest("hex");
}

await mkdir(vendorRoot, { recursive: true });
await mkdir(manifestsRoot, { recursive: true });
const index = [];

for (const source of config.sources) {
  if (!allowedLicenses.has(source.license)) throw new Error(`License not allowed: ${source.id}`);
  if (!source.repository.startsWith("https://github.com/")) throw new Error(`Non-GitHub source: ${source.id}`);
  if (!/^[a-f0-9]{40}$/.test(source.revision)) throw new Error(`Unpinned revision: ${source.id}`);

  const localRoot = path.join(extractedRoot, source.localSource);
  const targetRoot = path.join(vendorRoot, source.id);
  const targetExists = await stat(targetRoot).then(() => true, () => false);
  if (targetExists) throw new Error(`Target already exists; refusing overwrite: ${targetRoot}`);
  await mkdir(targetRoot, { recursive: true });

  for (const include of source.includes) {
    assertSafeRelative(include);
    const from = path.join(localRoot, include);
    const to = path.join(targetRoot, include);
    await cp(from, to, {
      recursive: true,
      force: false,
      errorOnExist: true,
      preserveTimestamps: true,
      filter: makeCopyFilter(source, localRoot)
    });
  }

  const files = await walk(targetRoot);
  const manifestFiles = [];
  const securitySignals = [];
  const packageLifecycleScripts = [];
  for (const file of files) {
    const relative = path.relative(targetRoot, file).replaceAll("\\", "/");
    const extension = path.extname(file).toLowerCase();
    if (forbiddenExtensions.has(extension)) throw new Error(`Forbidden executable file: ${source.id}/${relative}`);
    const fileStat = await stat(file);
    manifestFiles.push({ path: relative, bytes: fileStat.size, sha256: await sha256(file) });

    if (path.basename(file) === "package.json") {
      const packageJson = JSON.parse(await readFile(file, "utf8"));
      for (const name of ["preinstall", "install", "postinstall", "prepare"]) {
        if (packageJson.scripts?.[name]) packageLifecycleScripts.push({ path: relative, name, command: packageJson.scripts[name] });
      }
    }
    if (textExtensions.has(extension) && fileStat.size <= 1_000_000) {
      const content = await readFile(file, "utf8");
      for (const [kind, pattern] of signalPatterns) {
        if (kind === "remote-script" && [".md", ".mdx"].includes(extension)) continue;
        const matches = content.match(pattern);
        if (matches?.length) securitySignals.push({ path: relative, kind, occurrences: matches.length });
      }
    }
  }
  manifestFiles.sort((a, b) => a.path.localeCompare(b.path));
  securitySignals.sort((a, b) => a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind));
  packageLifecycleScripts.sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name));

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      id: source.id,
      name: source.name,
      category: source.category,
      repository: source.repository,
      revision: source.revision,
      license: source.license,
      archive: await (async () => {
        const archivePath = path.join(archivesRoot, `${source.localSource}.tar.gz`);
        const archiveStat = await stat(archivePath);
        return {
          url: `https://codeload.github.com/${source.repository.slice("https://github.com/".length)}/tar.gz/${source.revision}`,
          bytes: archiveStat.size,
          sha256: await sha256(archivePath)
        };
      })()
    },
    safety: {
      thirdPartyCodeExecuted: false,
      forbiddenExecutableFiles: 0,
      packageLifecycleScripts,
      reviewSignals: securitySignals,
      note: "Signals are static-review leads, not proof of malicious behavior. Upstream source remains unmodified."
    },
    fileCount: manifestFiles.length,
    totalBytes: manifestFiles.reduce((sum, file) => sum + file.bytes, 0),
    files: manifestFiles
  };
  const manifestPath = path.join(manifestsRoot, `${source.id}.json`);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  index.push({
    id: source.id,
    name: source.name,
    category: source.category,
    repository: source.repository,
    revision: source.revision,
    license: source.license,
    sourcePath: `vendor/curated/${source.id}`,
    manifestPath: `sources/manifests/${source.id}.json`,
    fileCount: manifest.fileCount,
    totalBytes: manifest.totalBytes,
    securityReview: {
      status: "static-scan-complete-runtime-untested",
      forbiddenExecutableFiles: 0,
      lifecycleScriptCount: packageLifecycleScripts.length,
      reviewSignalCount: securitySignals.length,
      thirdPartyCodeExecuted: false
    }
  });
}

await writeFile(path.join(root, "sources", "index.json"), `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), sources: index }, null, 2)}\n`, "utf8");
console.log(`Imported ${index.length} curated sources (${index.reduce((sum, item) => sum + item.fileCount, 0)} files).`);
