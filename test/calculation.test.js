// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateWith,validateInput} from '../src/calculation.js';
const input={jd_ut:2451545,latitude:35,longitude:139};
const good = {ephemeris:'swiss',returnFlags:258,longitude:1,latitude:0,distance:1,longitudeSpeed:1,latitudeSpeed:0,distanceSpeed:0};
const engine = calc => ({version:'2.10.03',calc,houses:()=>({returnFlags:0,requestedSystem:'P',cusps:Array(12).fill(1),ascendant:1,midheaven:2}),deltaT:()=>0.001});
test('failed planet preserves the other nine planets',()=>{
 for(const p of [{ephemeris:'moshier',returnFlags:260},{ephemeris:'swiss',returnFlags:2},{ephemeris:'swiss',returnFlags:258,warning:'missing file'}]){
  const r=calculateWith(engine((jd,id)=>id===1?p:good),input);
  assert.equal(r.result_status,'PARTIAL');assert.equal(r.valid_planet_count,9);
  assert.equal(r.positions[1].status,'UNAVAILABLE');assert.equal(r.positions[1].longitude,undefined);
  assert.equal(r.positions[9].longitude,1);assert.equal(r.houses.status,'VALID');
 }
 assert.throws(()=>calculateWith({version:'2.10.04'},input),{code:'RUNTIME_VERSION_MISMATCH'});
});
test('recognized per-body error continues, missing flags and traps abort globally',()=>{
 const e=engine((jd,id)=>{if(id===3)throw Object.assign(new Error('test'),{name:'SwissEphError',fn:'swe_calc_ut'});return good;});
 assert.equal(calculateWith(e,input).valid_planet_count,9);
 for(const calc of [()=>({...good,returnFlags:undefined}),()=>{throw new WebAssembly.RuntimeError('trap');}])assert.throws(()=>calculateWith(engine(calc),input),{code:'GLOBAL_RUNTIME_FAIL'});
});
test('no valid data is not reported as success',()=>{
 const e=engine(()=>({...good,ephemeris:'moshier',returnFlags:260}));
 e.houses=()=>({requestedSystem:'P',returnFlags:-1,substituted:true});
 const r=calculateWith(e,input);assert.equal(r.result_status,'UNAVAILABLE');assert.equal(r.ephemeris_mode,null);
});
test('nonfinite input is rejected',()=>{
 for(const jd_ut of [NaN,Infinity,-Infinity])assert.throws(()=>validateInput({...input,jd_ut}),{code:'INVALID_INPUT'});
});
