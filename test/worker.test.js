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
const planetCore=positions=>positions.map(p=>Object.fromEntries(Object.entries(p).filter(([k])=>!k.startsWith('house'))));
for(const caseName of ['case-a','case-b','case-c','case-d','case-e-before','case-e-after','case-f-before','case-f-after','case-g-before','case-g-after'])test(`K19 ${caseName} fixed K02 input matches native planets, angles, cusps and all aspect states`,async()=>{
 const f=JSON.parse(readFileSync(new URL(`./fixtures/${caseName}.json`,import.meta.url),'utf8'));
 const response=await callK02(f.input);assert.equal(response.status,200);
 const b=await response.json(),e=f.expected,t=f.tolerance;
 const angle=(actual,expected,tolerance,label)=>{
  assert.ok(Number.isFinite(actual),label+' finite');
  const difference=Math.abs(actual-expected)%360;
  assert.ok(Math.min(difference,360-difference)<=tolerance,label);
 };
 assert.deepEqual(b.input_echo,f.input);assert.ok(Math.abs(b.jd_ut-e.jd_ut)<1e-9);
 assert.equal(b.positions.length,10);assert.equal(b.result_status,caseName.startsWith('case-e')?'PARTIAL':'COMPLETE');
 if(caseName.startsWith('case-e')){assert.equal(b.time_status,'CONDITIONAL');assert.ok(b.limitations.includes('HISTORICAL_TIME_CONDITIONAL'));}
 for(const [body,p] of Object.entries(e.planets)){
  const actual=b.positions.find(v=>v.body===body);assert.equal(actual.status,'VALID');
  angle(actual.longitude,p.longitude,t.longitude_degrees,body+' longitude');
  assert.ok(Math.abs(actual.longitude_speed-p.longitude_speed)<=t.speed_degrees_per_day,body+' speed');
  assert.equal(actual.return_flag,258);
 }
 assert.equal(b.houses.status,'VALID');assert.equal(b.houses.system,'PLACIDUS');assert.equal(b.houses.return_flag,0);
 angle(b.houses.asc,e.asc,t.angle_degrees,'ASC');angle(b.houses.mc,e.mc,t.angle_degrees,'MC');
 assert.equal(b.houses.cusps.length,12);b.houses.cusps.forEach((v,i)=>angle(v,e.cusps[i],t.cusp_degrees,'cusp '+(i+1)));
 assert.deepEqual(b.aspects.pairs.map(p=>({body_a:p.body_a,body_b:p.body_b,status:p.status,aspect:p.aspect??null})),e.aspects);
 assert.equal(b.K08_AUDIT.ASPECT_45_PAIRS_VALID,true);
 if(caseName.startsWith('case-g')){
  const moon=b.positions.find(p=>p.body==='MOON');
  assert.equal(moon.sign,e.moon_sign);assert.equal(moon.sign_boundary_sensitive,true);
  assert.equal(b.K08_NATAL_RESULT.PLANETS.MOON.SIGN,e.moon_sign);
  assert.ok(Math.abs(moon.longitude-e.planets.MOON.longitude)<1e-6);
 }
 if(caseName.startsWith('case-f')){
  const sun=b.positions.find(p=>p.body==='SUN');
  assert.equal(sun.sign,e.sun_sign);assert.equal(sun.sign_boundary_sensitive,true);
  assert.equal(b.K08_NATAL_RESULT.PLANETS.SUN.SIGN,e.sun_sign);
  assert.ok(Math.abs(sun.longitude-e.planets.SUN.longitude)<1e-6);
 }
 assert.equal(b.K08_AUDIT.REGRESSION_SUITE_VALID,null);assert.equal(b.K09_USAGE_STATUS,'LOCAL_BLOCK');
});
test('CASE_E refuses modern offset substitution and unavailable historical confidence',async()=>{
 const f=JSON.parse(readFileSync(new URL('./fixtures/case-e-before.json',import.meta.url),'utf8'));
 for(const patch of [{UTC_OFFSET_EFFECTIVE:'+00:00',UTC_DATETIME:'1911-03-10T12:00:00Z'},{PRE_1970_CONFIDENCE:'UNAVAILABLE'}]){
  const response=await callK02({...f.input,...patch});assert.equal(response.status,422);
  const b=await response.json();assert.equal(b.calculation_performed,false);assert.equal(b.positions,undefined);
 }
});
test('CASE_B rejects a winter offset even when local and UTC arithmetic agrees',async()=>{
 const f=JSON.parse(readFileSync(new URL('./fixtures/case-b.json',import.meta.url),'utf8'));
 const response=await callK02({...f.input,UTC_OFFSET_EFFECTIVE:'+00:00',UTC_DATETIME:'2000-07-01T12:00:00Z'});
 assert.equal(response.status,422);const b=await response.json();
 assert.equal(b.calculation_performed,false);assert.equal(b.positions,undefined);
});
test('K02 solar boundary service matches native equinox reference',async()=>{
 const body={TARGET_SOLAR_LONGITUDE_DEG:0,SEARCH_START_UTC:'2000-03-20T00:00:00Z',SEARCH_END_UTC:'2000-03-21T00:00:00Z',TIME_SCALE_REQUIREMENT:'UT',K02_VERSION:'K02_v2.4_PRODUCTION'};
 const r=await worker.fetch('/calculate/solar-boundary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal(r.status,200);const b=await r.json();const t=Date.parse(b.BOUNDARY_UTC_DATETIME);
 assert.ok(t>=Date.parse('2000-03-20T07:35:14Z')&&t<=Date.parse('2000-03-20T07:35:15Z'));assert.ok(b.BRACKET_WIDTH_SECONDS<=0.1);
 assert.equal(b.CALCULATION_STATUS,'CALCULATED');assert.equal(b.CONFIDENCE_STATUS,'CONDITIONAL');assert.equal(b.positions,undefined);assert.equal(b.houses,undefined);
});
test('approximate overnight request retains center without calculating a substitute instant',async()=>{
 const body={k02:{...k02,TIME_PRECISION:'APPROXIMATE',NORMALIZED_BIRTH_TIME:'00:15',LOCAL_CIVIL_DATETIME:'2000-01-01T00:15:00',UTC_DATETIME:null},start_utc:'1999-12-31T23:30:00Z',end_utc:'2000-01-01T01:00:00Z',local_range:{start_local:'1999-12-31T23:30:00',end_local:'2000-01-01T01:00:00'}};
 const r=await worker.fetch('/calculate/k02/range',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal(r.status,200);const b=await r.json();assert.deepEqual(b.input_echo,body);assert.equal(b.jd_ut,undefined);assert.equal(b.range_contract,'K08_EXPLICIT_UTC_RANGE_v3');assert.equal(b.time_status,'CONDITIONAL');
});
test('planet houses match native swetest at J2000 Tokyo',async()=>{
 const b=await (await call()).json();
 assert.equal(b.K09_USAGE_STATUS,'LOCAL_BLOCK');assert.equal(b.K08_NATAL_RESULT.OVERALL_STATUS,'RUNTIME_NOT_APPROVED');
 assert.equal(b.K08_NATAL_RESULT.PLANETS.SUN.LONGITUDE,b.positions[0].longitude);
 assert.equal(b.K08_NATAL_RESULT.ASPECTS.length,45);assert.equal(b.K08_AUDIT.OVERALL,'FAIL');
 assert.equal(b.K08_NATAL_RESULT.TIME.UTC_DATETIME,null);
 const expected=[5.1460597,3.4592438,4.8796420,3.9938010,6.7209662,8.8702119,9.3548770,6.2600946,5.8755633,4.3451555];
 b.positions.forEach((p,i)=>{assert.equal(p.house,Math.floor(expected[i]));assert.ok(Math.abs(p.house_position-expected[i])<1e-6);});
 b.positions.forEach(p=>{assert.equal(p.house_cusp_status,'VALID');assert.equal(typeof p.house_cusp_sensitive,'boolean');assert.ok(p.house_cusp_distance_degrees>=0);});
});
test('solar 0-degree crossing agrees with native Swiss Ephemeris reference bracket',async()=>{
 // Official swetest64 2.10.03, -b20.3.2000 -ut07:35:14 / :15 -p0 -fPls -eswe:
 // 359.9999925 / 0.0000040 degrees, using the same sepl_18.se1 data.
 const source={...k02,NORMALIZED_BIRTH_DATE:'2000-03-20',TIME_PRECISION:'UNKNOWN',NORMALIZED_BIRTH_TIME:null,LOCAL_CIVIL_DATETIME:null,UTC_DATETIME:null};
 const r=await worker.fetch('/calculate/k02/range',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({k02:source,start_utc:'2000-03-20T00:00:00Z',end_utc:'2000-03-20T23:59:59Z'})});
 assert.equal(r.status,200);const b=await r.json();const sun=b.positions[0];
 assert.equal(sun.transition_brackets.length,1);const boundary=sun.transition_brackets[0];
 assert.equal(boundary.from_sign_index,11);assert.equal(boundary.to_sign_index,0);
 assert.equal(boundary.direction,'DIRECT');assert.ok(boundary.width_seconds<=1);
 assert.ok(Date.parse(boundary.start_utc)<=Date.parse('2000-03-20T07:35:15Z'));
 assert.ok(Date.parse(boundary.end_utc)>=Date.parse('2000-03-20T07:35:14Z'));
 assert.ok(boundary.start_longitude>359.99);assert.ok(boundary.end_longitude<0.01);
 assert.equal(sun.all_transitions_certified,false);assert.equal(b.search_budget_exhausted,false);
});
test('explicit K02 range runs in Workers without selecting a birth instant',async()=>{
 const input={k02:{...k02,TIME_PRECISION:'UNKNOWN',NORMALIZED_BIRTH_TIME:null,LOCAL_CIVIL_DATETIME:null,UTC_DATETIME:null},start_utc:'2000-01-01T00:00:00Z',end_utc:'2000-01-01T23:59:59Z'};
 const r=await worker.fetch('/calculate/k02/range',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 assert.equal(r.status,200);const b=await r.json();assert.equal(b.sample_count,289);assert.equal(b.positions.length,10);assert.deepEqual(b.input_echo,input);
 assert.equal(b.jd_ut,undefined);assert.equal(b.houses.asc_status,'UNAVAILABLE');assert.ok(b.positions.every(p=>p.SIGN_STABLE_WITHOUT_TIME!==true));
 const bad=await worker.fetch('/calculate/k02/range',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,end_utc:'2000-01-01T12:00:00Z'})});
 assert.equal(bad.status,422);const rejected=await bad.json();assert.equal(rejected.calculation_performed,false);assert.equal(rejected.positions,undefined);
 assert.equal(b.range_contract,'K08_EXPLICIT_UTC_RANGE_v3');assert.equal(b.range_consistency_status,'CONDITIONAL');
 assert.equal(b.aspects.scope,'EXPLICIT_UTC_RANGE');assert.equal(b.aspects.pair_count,45);
 assert.equal(b.aspects.evaluated_sample_count,b.evaluated_sample_count);
 assert.ok(b.aspects.pairs.every(p=>p.STABLE_WITHOUT_TIME!==true));
 const transitions=b.aspects.pairs.flatMap(p=>p.transition_brackets);
 assert.ok(transitions.length>0);assert.ok(transitions.every(t=>t.width_seconds<=1&&t.from_state!==t.to_state));
 assert.equal(b.aspects.method,'SAMPLED_STATES_WITH_BRACKET_REFINEMENT');
});
test('K02 UTC conversion matches JD and supports planets without geography',async()=>{
 const mismatch=await callK02({...k02,TZDB_VERSION:'2025b'});assert.equal(mismatch.status,422);assert.equal((await mismatch.json()).calculation_performed,false);
 const r=await callK02(k02);assert.equal(r.status,200);const b=await r.json();
 assert.equal(b.jd_ut,2451545);assert.deepEqual(b.input_echo,k02);assert.equal(b.valid_planet_count,10);
 const inconsistent=await callK02({...k02,UTC_OFFSET_EFFECTIVE:'+09:00'});assert.equal(inconsistent.status,422);const rejected=await inconsistent.json();assert.equal(rejected.error,'K02_UTC_OFFSET_MISMATCH');assert.equal(rejected.calculation_performed,false);
 assert.equal(b.time_consistency_status,'ARITHMETICALLY_CONSISTENT');assert.equal(b.timezone_audit.k02_declared_version,k02.TZDB_VERSION);assert.equal(b.timezone_audit.production_eligible,false);
 assert.equal(b.timezone_audit.validation_data_version,'2026c');assert.equal(b.timezone_audit.validation_data_comparison,'PINNED_VERSION_MATCH');
 assert.equal(b.positions[0].sign,'CAPRICORN');assert.equal(b.positions[0].motion,'DIRECT');assert.equal(b.positions[0].station_sensitive,null);
 assert.equal(b.aspects.pair_count,45);assert.equal(b.aspects.available_pair_count,45);assert.equal(b.aspects.scope,'SINGLE_INSTANT');
 const noGeo={...k02,LATITUDE:null,LONGITUDE:null,GEO_PRECISION:'UNAVAILABLE',GEO_STATUS:'UNAVAILABLE'};
 const partial=await (await callK02(noGeo)).json();assert.equal(partial.houses.status,'UNAVAILABLE_GEO');assert.deepEqual(planetCore(partial.positions),planetCore(b.positions));
 assert.deepEqual(partial.aspects,b.aspects);
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
 const reference=await (await call({...input,latitude:69.6492,longitude:18.9553})).json();
 assert.ok(Math.abs(reference.houses.asc-299.0790476)<1e-6);assert.ok(Math.abs(reference.houses.mc-297.3499015)<1e-6);
 assert.equal(reference.houses.cusps,undefined);assert.ok(reference.positions.every(p=>p.house===null));
 const r=await call({...input,latitude:80});assert.equal(r.status,200);
 const b=await r.json();assert.equal(b.houses.status,'UNAVAILABLE_PLACIDUS');assert.equal(b.calculation_performed,true);assert.equal(b.valid_planet_count,10);
 assert.equal(b.runtime_status,'PARTIAL_RESULT');assert.equal(b.houses.cusps,undefined);assert.equal(b.houses.asc_status,'CONDITIONAL');
 const normal=await (await call()).json();assert.deepEqual(planetCore(b.positions),planetCore(normal.positions));
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
