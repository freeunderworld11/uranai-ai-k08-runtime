// SPDX-License-Identifier: AGPL-3.0-only
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unstable_dev} from 'wrangler';
import {k02} from './fixtures/k02.js';
let worker;
before(async()=>{worker=await unstable_dev('src/worker.js',{config:'wrangler.jsonc',local:true,port:0,experimental:{disableExperimentalWarning:true}});});
after(async()=>{await worker?.stop();});
const input={jd_ut:2451545,latitude:35.6762,longitude:139.6503};
const call=(body=input)=>worker.fetch('/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const callK02=body=>worker.fetch('/calculate/k02',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('explicit K02 range runs in Workers without selecting a birth instant',async()=>{
 const input={k02:{...k02,TIME_PRECISION:'UNKNOWN',UTC_DATETIME:null},start_utc:'2000-01-01T00:00:00Z',end_utc:'2000-01-02T00:00:00Z'};
 const r=await worker.fetch('/calculate/k02/range',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 assert.equal(r.status,200);const b=await r.json();assert.equal(b.sample_count,289);assert.equal(b.positions.length,10);assert.deepEqual(b.input_echo,input);
 assert.equal(b.jd_ut,undefined);assert.equal(b.houses.asc_status,'UNAVAILABLE');assert.ok(b.positions.every(p=>p.SIGN_STABLE_WITHOUT_TIME!==true));
});
test('K02 UTC conversion matches JD and supports planets without geography',async()=>{
 const r=await callK02(k02);assert.equal(r.status,200);const b=await r.json();
 assert.equal(b.jd_ut,2451545);assert.deepEqual(b.input_echo,k02);assert.equal(b.valid_planet_count,10);
 const noGeo={...k02,LATITUDE:null,LONGITUDE:null,GEO_PRECISION:'UNAVAILABLE',GEO_STATUS:'UNAVAILABLE'};
 const partial=await (await callK02(noGeo)).json();assert.equal(partial.houses.status,'UNAVAILABLE_GEO');assert.deepEqual(partial.positions,b.positions);
 assert.equal(partial.result_status,'PARTIAL');
 const blocked=await callK02({...k02,LOCAL_TIME_STATUS:'AMBIGUOUS'});assert.equal(blocked.status,422);const hold=await blocked.json();assert.equal(hold.positions,undefined);assert.equal(hold.calculation_performed,false);
});
test('health does not claim K08 deployment approval',async()=>{
 const r=await worker.fetch('/health'); assert.equal(r.status,200);
 const b=await r.json();assert.equal(b.engine_integrated,true);assert.equal(b.calculation_ready,false);assert.equal(b.k08_deployment_gate,'PENDING');
});
test('Swiss positions match the recorded native reference',async()=>{
 const references=JSON.parse(readFileSync(new URL('./fixtures/native.json',import.meta.url)));
 for(const reference of references){
  const r=await call({...input,jd_ut:reference.jd});assert.equal(r.status,200);
  const b=await r.json();assert.equal(b.runtime_version,'2.10.03');assert.equal(b.calculation_performed,true);
  assert.equal(b.positions.length,10);assert.equal(b.houses.cusps.length,12);assert.equal(b.houses.return_flag,0);
  b.houses.cusps.forEach((cusp,i)=>assert.ok(Math.abs(cusp-reference.houses.cusps[i])<1e-6));
  assert.ok(Math.abs(b.houses.asc-reference.houses.asc)<1e-6);
  assert.ok(Math.abs(b.houses.mc-reference.houses.mc)<1e-6);
  b.positions.forEach((p,i)=>{
   assert.equal(p.return_flag,258);
   assert.ok(Math.abs(p.longitude-reference.positions[i][0])<1e-6);
   assert.ok(Math.abs(p.latitude-reference.positions[i][1])<1e-6);
   assert.ok(Math.abs(p.distance_au-reference.positions[i][2])<1e-8);
   assert.ok(Math.abs(p.longitude_speed-reference.positions[i][3])<1e-6);
  });
 }
});
test('polar Placidus fallback preserves all normal planets',async()=>{
 const r=await call({...input,latitude:80});assert.equal(r.status,200);
 const b=await r.json();assert.equal(b.houses.status,'UNAVAILABLE_PLACIDUS');assert.equal(b.calculation_performed,true);assert.equal(b.valid_planet_count,10);
 assert.equal(b.runtime_status,'PARTIAL_RESULT');assert.equal(b.houses.cusps,undefined);assert.equal(b.houses.asc,undefined);
 const normal=await (await call()).json();assert.deepEqual(b.positions,normal.positions);
});
test('date boundaries and invalid coordinates',async()=>{
 for(const jd_ut of [2415020.5,2488069.5-1/86400]) assert.equal((await call({...input,jd_ut})).status,200);
 for(const jd_ut of [2415020.5-1/86400,2488069.5]) assert.equal((await call({...input,jd_ut})).status,422);
 for(const value of [{...input,latitude:91},{...input,longitude:-181},{...input,jd_ut:'2451545'},{...input,flags:4},null]) assert.equal((await call(value)).status,400);
});
test('malformed JSON, content type, large bodies',async()=>{
 assert.equal((await worker.fetch('/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
 assert.equal((await worker.fetch('/calculate',{method:'POST',body:'{}'})).status,415);
 assert.equal((await worker.fetch('/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:' '.repeat(5000)})).status,413);
});
test('concurrent requests stay independent',async()=>{
 const inputs=[input,{...input,longitude:-74,latitude:40.7,jd_ut:2461293.5},input];
 const results=await Promise.all(inputs.map(async x=>{const r=await call(x);assert.equal(r.status,200);return r.json();}));
 assert.deepEqual(results[0],results[2]);assert.notEqual(results[0].houses.asc,results[1].houses.asc);
});
test('HTTP method and route contracts',async()=>{
 assert.equal((await worker.fetch('/missing')).status,404);
 const method=await worker.fetch('/calculate');assert.equal(method.status,405);assert.equal(method.headers.get('Allow'),'POST, OPTIONS');
 const preflight=await worker.fetch('/calculate',{method:'OPTIONS'});assert.equal(preflight.status,204);assert.equal(await preflight.text(),'');
});
test('real WASM without ephemeris files is rejected',async()=>{
 const missing=await unstable_dev('test/fixtures/missing-data-worker.js',{config:'wrangler.jsonc',local:true,port:0,experimental:{disableExperimentalWarning:true}});
 try {
  const r=await missing.fetch('/');assert.equal(r.status,200);
  const b=await r.json();assert.equal(b.valid_planet_count,0);assert.equal(b.result_status,'PARTIAL');
  assert.ok(b.positions.every(p=>p.status==='UNAVAILABLE' && p.longitude===undefined));assert.equal(b.houses.status,'VALID');
 } finally {await missing.stop();}
});
