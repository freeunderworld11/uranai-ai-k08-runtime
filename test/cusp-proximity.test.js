import test from 'node:test';
import assert from 'node:assert/strict';
import {cuspProximity} from '../src/cusp-proximity.js';
import {withPlanetHouses} from '../src/planet-houses.js';
const cusps=Array.from({length:12},(_,i)=>i*30);
test('one-degree inclusive threshold, both sides and wrap',()=>{
 for(const longitude of [0,1,359,360,-1,721])assert.equal(cuspProximity(longitude,cusps).house_cusp_sensitive,true);
 for(const longitude of [1.000001,358.999999,15])assert.equal(cuspProximity(longitude,cusps).house_cusp_sensitive,false);
 assert.equal(cuspProximity(359,cusps).house_cusp_distance_degrees,1);
 assert.deepEqual(cuspProximity(15,cusps).house_nearest_cusps,[1,2]);
});
test('missing or corrupt cusps stay unknown',()=>{
 for(const c of [null,[],cusps.slice(1),[NaN,...cusps.slice(1)]])assert.equal(cuspProximity(0,c).house_cusp_sensitive,null);
});
test('proximity never overrides latitude-aware house assignment',()=>{
 const r=withPlanetHouses({obliquity:()=>({trueObliquity:23.4}),housePosition:()=>({position:12.9})},
  {result_status:'COMPLETE',jd_ut:2451545,houses:{status:'VALID',armc:0,cusps},positions:[{status:'VALID',longitude:0.5,latitude:5}]},35);
 assert.equal(r.positions[0].house,12);assert.equal(r.positions[0].house_cusp_sensitive,true);assert.deepEqual(r.positions[0].house_nearby_cusps,[1]);
});
