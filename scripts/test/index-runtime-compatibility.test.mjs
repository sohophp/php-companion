import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

const { indexComposerSources } = await import(pathToFileURL(resolve(
  process.env.SOPHP_PRIVATE_INDEX_RUNTIME_MODULE ?? 'packages/index/dist/index.js')).href);

test('discovers nested Composer PHP sources and restores their cache on the active Node runtime', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-index-runtime-'));
  try {
    await mkdir(join(root, 'src', 'Nested'), { recursive: true });
    await mkdir(join(root, 'src', 'Tests'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({
      autoload: { 'psr-4': { 'App\\': 'src/' }, 'exclude-from-classmap': ['/src/Tests/'] },
    }));
    const expected = [join(root, 'src', 'A.php'), join(root, 'src', 'Nested', 'B.PHP')];
    await writeFile(expected[0], '<?php namespace App; class A {}');
    await writeFile(expected[1], '<?php namespace App\\Nested; class B {}');
    await writeFile(join(root, 'src', 'Nested', 'ignore.txt'), 'ignored');
    await writeFile(join(root, 'src', 'Tests', 'Excluded.php'), '<?php class Excluded {}');
    const parsed = [], restored = [];
    const cache = { directory: join(root, '.cache'), version: 'runtime-discovery-v1',
      restore: (payload, source) => { assert.equal(payload.path, source.path); restored.push(source.path); return true; } };
    const cold = await indexComposerSources(root, { cache, onSource: source => {
      parsed.push(source.path); return { path: source.path };
    } });
    assert.equal(cold.files, 2); assert.equal(cold.cached, 0);
    assert.equal(cold.complete, true); assert.equal(cold.projectComplete, true);
    assert.deepEqual(cold.warnings, []); assert.deepEqual(parsed, expected);
    const warm = await indexComposerSources(root, { cache, onSource: () => assert.fail('Warm discovery must restore unchanged sources') });
    assert.equal(warm.files, 2); assert.equal(warm.cached, 2);
    assert.equal(warm.complete, true); assert.deepEqual(warm.warnings, []);
    assert.deepEqual(restored, expected);
  } finally { await rm(root, { recursive: true, force: true }); }
});

async function project(run) {
 const root=await mkdtemp(join(tmpdir(),'sophp-minimum-boundary-'));
 try{
  await mkdir(join(root,'src','Nested'),{recursive:true});
  await writeFile(join(root,'composer.json'),JSON.stringify({autoload:{'psr-4':{'App\\':'src/'}}}));
  await writeFile(join(root,'src','Nested','A.php'),'<?php class A {}');
  await run(root);
 }finally{await rm(root,{recursive:true,force:true});}
}
test('does not follow directory links or their cycles',async()=>project(async root=>{
 await mkdir(join(root,'outside'));await writeFile(join(root,'outside','External.php'),'<?php class External {}');
 await symlink(join(root,'outside'),join(root,'src','linked'),process.platform==='win32'?'junction':'dir');
 await symlink(join(root,'src'),join(root,'src','Nested','cycle'),process.platform==='win32'?'junction':'dir');
 const paths=[];const result=await indexComposerSources(root,{onSource:source=>paths.push(source.path)});
 assert.equal(result.complete,true);assert.deepEqual(paths,[join(root,'src','Nested','A.php')]);
}));
test('cancels discovery without publishing a partial source list',async()=>project(async root=>{
 let checks=0,emitted=0;
 const result=await indexComposerSources(root,{shouldContinue:()=>++checks<3,onSource:()=>{emitted++;}});
 assert.equal(result.complete,false);assert.equal(result.files,0);assert.equal(emitted,0);
 assert.ok(result.warnings.includes('Project indexing was cancelled.'));
}));
test('keeps the project inventory limit instead of silently truncating',async()=>project(async root=>{
 await writeFile(join(root,'src','Z.php'),'<?php class Z {}');let emitted=0;
 const result=await indexComposerSources(root,{limits:{maxFiles:1,maxFileSizeBytes:512000,maxTotalBytes:1024000},onSource:()=>{emitted++;}});
 assert.equal(result.complete,false);assert.equal(result.files,0);assert.equal(emitted,0);
 assert.ok(result.warnings.includes('Project source index exceeded 1 files.'));
}));
test('keeps project-first order and deterministic dependency truncation',async()=>project(async root=>{
 await mkdir(join(root,'vendor','composer'),{recursive:true});await mkdir(join(root,'vendor','acme','lib','src','Nested'),{recursive:true});
 await writeFile(join(root,'composer.lock'),JSON.stringify({packages:[{name:'acme/lib',autoload:{'psr-4':{'Acme\\':'src/'}}}]}));
 await writeFile(join(root,'vendor','composer','installed.json'),JSON.stringify({packages:[{name:'acme/lib',install_path:'../acme/lib'}]}));
 const first=join(root,'vendor','acme','lib','src','Nested','A.php');await writeFile(first,'<?php class VendorA {}');
 await writeFile(join(root,'vendor','acme','lib','src','Z.php'),'<?php class VendorZ {}');
 const paths=[];const result=await indexComposerSources(root,{limits:{maxFiles:2,maxFileSizeBytes:512000,maxTotalBytes:1024000},onSource:source=>paths.push(source.path)});
 assert.equal(result.files,2);assert.equal(result.complete,false);assert.equal(result.projectComplete,true);
 assert.ok(result.warnings.some(warning=>warning.includes('Dependency index was truncated')));
 assert.deepEqual(paths,[join(root,'src','Nested','A.php'),first]);
}));
