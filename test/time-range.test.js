import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptRange,calculateRangeWith} from '../src/time-range.js';
import {k02} from './fixtures/k02.js';
const input={k02:{...k02,TIME_PRECISION:'UNKNOWN',UTC_DATETIME:null},start_utc:'2000-01-01T00:00:00Z',end_utc:'2000-01-01T01:00:00Z'};
const good={ephemeris:'swiss',returnFlags:258,longitude:1,latitude:0,distance:1,longitudeSpeed:1,latitudeSpeed:0,distanceSpeed:0};
const engine=calc=>({version:'2.10.03',julianDay:(y,m,d,h)=>2451544.5+h/24,calc,deltaT:()=>0.001});
test('range schema, date bounds and unresolved civil time fail closed',()=>{
 assert.deepEqual(adaptRange(input).input_echo,input);
 for(const end_utc of [input.start_utc,'2000-01-03T00:00:00Z','2000-02-30T00:00:00Z'])assert.throws(()=>adaptRange({...input,end_utc}));
 assert.throws(()=>adaptRange({...input,start_utc:undefined}));
 assert.equal(adaptRange({...input,k02:{...input.k02,LOCAL_TIME_STATUS:'AMBIGUOUS'}}).result_status,'UNAVAILABLE');
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
