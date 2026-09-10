import test from 'node:test';
import assert from 'node:assert/strict';
import {withPlanetHouses} from '../src/planet-houses.js';
const input={result_status:'COMPLETE',jd_ut:2451545,houses:{status:'VALID',armc:100},positions:[{body:'SUN',status:'VALID',longitude:280,latitude:1}]};
test('house uses longitude and latitude and rejects fallback warning or invalid position',()=>{
 const engine={obliquity:()=>({trueObliquity:23.4}),housePosition:(...args)=>{assert.deepEqual(args,[100,35,23.4,280,1]);return {position:5.5};}};
 assert.equal(withPlanetHouses(engine,input,35).positions[0].house,5);
 for(const h of [{position:0},{position:13},{position:NaN},{position:5,warning:'fallback'}]) {
  const r=withPlanetHouses({...engine,housePosition:()=>h},input,35);
  assert.equal(r.positions[0].longitude,280);assert.equal(r.positions[0].house,null);assert.equal(r.result_status,'PARTIAL');
 }
});
test('unavailable houses skip dependent calculations',()=>{
 const r=withPlanetHouses({}, {...input,houses:{status:'UNAVAILABLE_PLACIDUS'}},35);
 assert.equal(r.positions[0].house_status,'UNAVAILABLE');assert.equal(r.positions[0].longitude,280);
});
