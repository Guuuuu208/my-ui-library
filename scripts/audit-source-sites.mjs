// Inspect public responses without executing page scripts or saving cookies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  ['mobbin','https://mobbin.com/'], ['saasui','https://www.saasui.design/'],
  ['saasframe','https://www.saasframe.io/'], ['saasinterface','https://saasinterface.com/'],
  ['fancy','https://www.fancycomponents.dev/docs/components/text/random-letter-swap']
];
const results = await Promise.all(targets.map(async ([id,url]) => {
  try {
    const {stdout} = await run('curl.exe', ['--silent','--show-error','--location','--proto','=https','--proto-redir','=https','--connect-timeout','5','--max-time','35','--max-redirs','5','--include','--write-out','\n__FETCH_META__%{json}',url], {maxBuffer:32*1024*1024});
    const marker = stdout.lastIndexOf('\n__FETCH_META__');
    const response = stdout.slice(0,marker);
    const meta = JSON.parse(stdout.slice(marker+'\n__FETCH_META__'.length));
    const flags = {nextjs:/\/_next\/|__NEXT_DATA__/.test(response),framer:/framerusercontent\.com|data-framer/.test(response),webflow:/data-wf-site|webflow\.js|website-files\.com/.test(response)};
    const links = [...response.matchAll(/href=["']([^"']+)["']/g)].map(m=>m[1].replace(/&amp;/g,'&'));
    const githubLinks = [...new Set(links.filter(x=>/^https:\/\/github\.com\//.test(x)))];
    return {id, requestedUrl:url, effectiveUrl:meta.url_effective, httpStatus:meta.http_code, redirectCount:meta.num_redirects, redirectLocations:[...response.matchAll(/^location:\s*(.+)$/gim)].map(m=>m[1].trim()), tlsVerificationResult:meta.ssl_verify_result, htmlBytes:meta.size_download, observedFrameworkSignals:flags, scriptTags:(response.match(/<script\b/gi)||[]).length, stylesheetLinks:(response.match(/rel=["']stylesheet["']/gi)||[]).length, githubLinks, caveat:'仅检查公开页面响应、HTTPS 和跳转；不代表完整安全审计。技术标记属于该资料站本身，不能据此推断其截图内产品的源码。'};
  } catch (error) {return {id,requestedUrl:url,error:error.message.split('\n').slice(0,2).join(' '),caveat:'未完成此次直接连接验证；不得声称安全。'};}
}));
fs.mkdirSync(path.join(root,'analysis'),{recursive:true});
fs.writeFileSync(path.join(root,'analysis/source-site-checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
