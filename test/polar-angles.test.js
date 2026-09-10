import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPolarAngles} from '../src/polar-angles.js';
const input={jd_ut:2451545,latitude:70,longitude:20};
const original={returnFlags:-1,substituted:true,ascendant:300,midheaven:290};
const check={returnFlags:0,requestedSystem:'E',ascendant:300,midheaven:290};
test('angle agreement is conditional and mismatches are isolated',()=>{
 const r=checkPolarAngles({houses:()=>({...check,ascendant:301})},input,original);
 assert.equal(r.asc,undefined);assert.equal(r.mc,290);assert.equal(r.mc_status,'CONDITIONAL');assert.equal(r.cusps,undefined);
});
test('polar singularity, failed crosscheck and invalid angle remain unavailable',()=>{
 assert.equal(checkPolarAngles({}, {...input,latitude:90},original).asc_status,'UNAVAILABLE');
 assert.equal(checkPolarAngles({houses:()=>({...check,warning:'bad'})},input,original).mc_status,'UNAVAILABLE');
 assert.equal(checkPolarAngles({houses:()=>({...check,ascendant:NaN})},input,original).asc_status,'UNAVAILABLE');
});
