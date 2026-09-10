import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptRange,calculateRangeWith} from '../src/time-range.js';
import {k02} from './fixtures/k02.js';
import {refineSignBoundaries} from '../src/sign-boundaries.js';
const input={k02:{...k02,TIME_PRECISION:'UNKNOWN',UTC_DATETIME:null},start_utc:'2000-01-01T00:00:00Z',end_utc:'2000-01-01T01:00:00Z'};
const good={ephemeris:'swiss',returnFlags:258,longitude:1,latitude:0,distance:1,longitudeSpeed:1,latitudeSpeed:0,distanceSpeed:0};
const engine=calc=>({version:'2.10.03',julianDay:(y,m,d,h)=>2451544.5+h/24,calc,deltaT:()=>0.001});
test('range schema, date bounds and unresolved civil time fail closed',()=>{
 assert.deepEqual(adaptRange(input).input_echo,input);
 for(const end_utc of [input.start_utc,'2000-01-03T00:00:00Z','2000-02-30T00:00:00Z'])assert.throws(()=>adaptRange({...input,end_utc}));
 assert.throws(()=>adaptRange({...input,start_utc:undefined}));
 assert.equal(adaptRange({...input,k02:{...input.k02,LOCAL_TIME_STATUS:'AMBIGUOUS'}}).result_status,'UNAVAILABLE');
});

const utc=t=>new Date(Date.UTC(2000,0,1)+Math.round(t)).toISOString();
const sampleFn=(longitude,speed=()=>1)=>t=>({positions:[{status:'VALID',longitude:longitude(t),longitude_speed:speed(t)}]});
test('forward and retrograde crossings including 360 wrap bracket the known root',()=>{
 for(const [base,slope,from,to] of [[30,1,0,1],[30,-1,1,0],[360,1,11,0],[0,-1,0,11]]) {
  const root=123456;
  const r=refineSignBoundaries([0,300000],sampleFn(t=>base+slope*(t-root)/100000,()=>slope),0,utc);
  assert.equal(r.transition_brackets.length,1);
  const b=r.transition_brackets[0];assert.equal(b.from_sign_index,from);assert.equal(b.to_sign_index,to);
  assert.ok(Date.parse(b.start_utc)<=Date.parse(utc(root)));assert.ok(Date.parse(b.end_utc)>=Date.parse(utc(root)));
  assert.ok(b.width_seconds<=1);assert.equal(r.all_transitions_certified,false);
 }
});
test('speed reversal reveals two crossings hidden between equal-sign grid points',()=>{
 const r=refineSignBoundaries([0,300000],sampleFn(t=>30.1-((t-150000)/100000)**2,t=>-2*(t-150000)),0,utc);
 assert.equal(r.transition_brackets.length,2);
 assert.deepEqual(r.transition_brackets.map(b=>b.direction),['DIRECT','RETROGRADE']);
});
test('failed midpoint and exhausted sample budget leave no fabricated boundary',()=>{
 for(const missing of [null,{positions:[{status:'UNAVAILABLE'}]}]) {
  const r=refineSignBoundaries([0,300000],t=>t===0||t===300000?sampleFn(x=>29+x/150000)(t):missing,0,utc);
  assert.equal(r.transition_brackets.length,0);assert.equal(r.boundary_search_status,'INCOMPLETE');
 }
});
test('an exact endpoint crossing is not duplicated and constant sign remains unproven',()=>{
 const r=refineSignBoundaries([0,150000,300000],sampleFn(t=>29+t/150000),0,utc);
 assert.equal(r.transition_brackets.length,1);
 assert.equal(refineSignBoundaries([0,300000],sampleFn(()=>10),0,utc).all_transitions_certified,false);
});
test('interior crossing with equal endpoint signs is found; agreement is never certified',()=>{
 const r=calculateRangeWith(engine(jd=>({...good,longitude:29+2*Math.sin((jd-2451544.5)*24*Math.PI)})),adaptRange(input));
 assert.equal(r.sample_count,13);assert.equal(r.positions[0].SIGN_TIME_DEPENDENT,true);
 const stable=calculateRangeWith(engine(()=>good),adaptRange(input));
 assert.equal(stable.positions[0].SIGN_STABLE_WITHOUT_TIME,null);
 assert.equal(stable.houses.asc_status,'UNAVAILABLE');
});
test('local failure retains other planets and unknown engine failure stops the range',()=>{
 const r=calculateRangeWith(engine((jd,id)=>id===1?{...good,returnFlags:260}:good),adaptRange(input));
 assert.equal(r.positions[1].status,'UNAVAILABLE');assert.equal(r.positions[0].status,'CONDITIONAL');
 assert.throws(()=>calculateRangeWith(engine(()=>({...good,returnFlags:undefined})),adaptRange(input)),{code:'GLOBAL_RUNTIME_FAIL'});
});
test('pathological repeated crossings respect the request evaluation limit',()=>{
 const gate=adaptRange({...input,end_utc:'2000-01-02T02:00:00Z'});
 const r=calculateRangeWith(engine(jd=>({...good,longitude:30+Math.cos((jd-2451544.5)*86400*Math.PI/300)})),gate);
 assert.equal(r.evaluated_sample_count,2048);assert.equal(r.search_budget_exhausted,true);
 assert.ok(r.positions.some(p=>p.boundary_search_status==='INCOMPLETE'));
 assert.ok(r.positions.every(p=>p.SIGN_STABLE_WITHOUT_TIME!==true));
});
