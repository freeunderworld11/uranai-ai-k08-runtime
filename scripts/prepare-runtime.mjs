// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const core = new URL('node_modules/@kuntay/swisseph/', root);
const data = new URL('node_modules/@kuntay/swisseph-data/', root);
const out = new URL('.generated/', root);
function checked(url, hash) {
  const bytes = readFileSync(url);
  if (createHash('sha256').update(bytes).digest('hex') !== hash) throw Error(`Integrity mismatch: ${url}`);
  return bytes;
}
const glue = checked(new URL('wasm/swisseph.mjs', core), 'e44715424792ff7754ee136c34addaf3aa3e3511afa30da37f6927e882aed677').toString();
const instance = checked(new URL('dist/instance.js', core), '9d42a3ef127e07874443eff2b704a8ab757801f3c8234b10cbfc6b58a87a0611').toString();
checked(new URL('wasm/swisseph.wasm', core), 'dc1b271513cfd971878bda7019ae0a48190abb8648dc90addb9ada75aba1628b');
for (const dir of [core, data]) {
  if (JSON.parse(readFileSync(new URL('package.json', dir))).version !== '0.2.2') throw Error('Unexpected dependency version');
}
const files = {
 'sepl_18.se1': 'ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66',
 'semo_18.se1': '1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7',
 'seas_18.se1': 'a2cd8fc33807c78ca9a700c91c2e042258b12fc4796519e00781440b5ad8b2e2'
};
mkdirSync(out, {recursive:true});
cpSync(new URL('dist/', core), new URL('dist/', out), {recursive:true});
cpSync(new URL('wasm/', core), new URL('wasm/', out), {recursive:true});
mkdirSync(new URL('ephe/', out), {recursive:true});
for (const [name, hash] of Object.entries(files)) writeFileSync(new URL(`ephe/${name}`, out), checked(new URL(`ephe/${name}`, data),hash));
function replaceOnce(text, from, to) {
  if (text.split(from).length !== 2) throw Error('Upstream patch target changed');
  return text.replace(from,to);
}
let patched = replaceOnce(glue,'var ENVIRONMENT_IS_NODE=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer";','var ENVIRONMENT_IS_NODE=false;');
patched = replaceOnce(patched,'wasmBinaryFile??=findWasmBinary();var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);','var result={instance:await WebAssembly.instantiate(compiledWasm,info)};');
writeFileSync(new URL('wasm/swisseph.mjs',out),'import compiledWasm from "./swisseph.wasm";\n'+patched);
// Expose the actual C return values so the adapter can reject fallback.
let api = replaceOnce(instance,'warning: message,\n            };\n        },\n        /** `calc()`','warning: message, returnFlags: ret,\n            };\n        },\n        /** `calc()`');
api = replaceOnce(api,'requestedSystem: system,','returnFlags: ret, requestedSystem: system,');
writeFileSync(new URL('dist/instance.js',out),api);
for(const [label, dir] of [['core',core],['data',data]]) {
 for(const name of ['LICENSE','NOTICE']) cpSync(new URL(name,dir),new URL(`${label}-${name}`,out));
}
console.log('Verified and prepared Swiss Ephemeris 2.10.03 for Workers');
