const fs=require('node:fs'),assert=require('node:assert/strict');
const brand=require('../src/retailer.json'),config=require('../app.config.js');
const expected=process.env.BRANCH||brand.id||'mobile';
assert.equal(brand.id||'mobile',expected,'Branch and retailer identity must match');
const prefix=expected==='mobile'?'/yourpetcare':`/yourpetcare/home/${expected}`;
assert.equal(config.experiments.baseUrl,prefix);
const html=fs.readFileSync('dist/index.html','utf8');
const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
assert.ok(scripts.length,'Export must contain a JavaScript bundle');
for(const url of scripts){assert.ok(url.startsWith(prefix+'/'),`Wrong bundle base: ${url}`);assert.ok(fs.existsSync('dist/'+decodeURIComponent(url.slice(prefix.length+1))),`Missing bundle: ${url}`);}
for(const route of ['home','map','calendar','shopping','retailer'])assert.ok(fs.existsSync(`dist/${route}.html`),`Missing route ${route}`);
for(const entry of [...brand.links,...brand.products])assert.equal(new URL(entry.url).protocol,'https:');
console.log(`Verified ${expected} assets and direct routes under ${prefix}`);
