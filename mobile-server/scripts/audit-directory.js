import {readFile,writeFile,mkdir} from 'node:fs/promises';
const rows=JSON.parse(await readFile(new URL('../data/providers.json',import.meta.url)));
const categories=new Set(['park','vet','shop','cafe','hotel','boarding','groomer','charity','sitter','trainer','shelter','funeral']);
const issues={missingAddress:[],partialAddress:[],duplicates:[],missingCoordinates:[],missingPhone:[],missingWebsite:[],missingCategory:[],invalidCategory:[],malformed:[],unknownAnimalSupport:[]},seen=new Map();
for(const p of rows){
 if(!p||typeof p!=='object'||!p.id||!p.name){issues.malformed.push(p?.id||'missing id');continue;}
 if(!p.address?.trim())issues.missingAddress.push(p.id);else if(p.address.trim().length<12||!/[a-z]/i.test(p.address)||/^\d+[ ,]*\d*$/.test(p.address))issues.partialAddress.push(p.id);
 if(!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||Math.abs(p.lat)>90||Math.abs(p.lon)>180)issues.missingCoordinates.push(p.id);
 if(!p.phone?.trim())issues.missingPhone.push(p.id);if(!p.website?.trim())issues.missingWebsite.push(p.id);
 if(!p.category)issues.missingCategory.push(p.id);else if(!categories.has(p.category))issues.invalidCategory.push(p.id);
 if(!Array.isArray(p.species_supported)||!p.species_supported.length)issues.unknownAnimalSupport.push(p.id);
 if(p.website){try{const u=new URL(p.website);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)issues.malformed.push(p.id);}catch{issues.malformed.push(p.id);}}
 const key=p.name.toLowerCase().replace(/\s+/g,' ').trim()+'|'+(p.address||'').toLowerCase().replace(/\s+/g,' ').trim();if(seen.has(key))issues.duplicates.push([seen.get(key),p.id]);else seen.set(key,p.id);
}
const report={total:rows.length,counts:Object.fromEntries(Object.entries(issues).map(([k,v])=>[k,v.length])),issues};
const output=new URL('../../docs/',import.meta.url);await mkdir(output,{recursive:true});await writeFile(new URL('DIRECTORY-AUDIT.json',output),JSON.stringify(report,null,2));
await writeFile(new URL('DIRECTORY-AUDIT.md',output),'# Directory quality audit\n\nDataset audit; no real-world details fabricated. Partial addresses are heuristic review candidates, not confirmed errors. See JSON for record IDs.\n\nTotal: '+rows.length+'\n\n'+Object.entries(report.counts).map(([k,n])=>'- '+k+': '+n).join('\n')+'\n\nKeep incomplete listings visible with explicit unknown values. Verify with provider/source before filling missing values; a website or map point alone is not evidence of street address, opening hours, supported animals or claimed status.\n');
console.log(JSON.stringify({total:report.total,...report.counts}));
