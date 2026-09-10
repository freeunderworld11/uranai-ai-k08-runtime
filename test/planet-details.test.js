import test from 'node:test';
import assert from 'node:assert/strict';
import {withPlanetDetails} from '../src/planet-details.js';
const detail=(longitude,longitude_speed=1)=>withPlanetDetails({positions:[{body:'SUN',status:'VALID',longitude,longitude_speed}]}).positions[0];
test('all twelve signs change at the exact boundary without display rounding',()=>{
 for(let i=0;i<12;i++) {
  const p=detail(i*30);assert.equal(p.sign_index,i);assert.equal(p.sign_degree,0);assert.equal(p.sign_boundary_sensitive,true);
  if(i>0)assert.equal(detail(i*30-1e-9).sign_index,i-1);
 }
 assert.equal(detail(359.99999999999994).sign,'PISCES');
 assert.equal(detail(360).sign,'ARIES');assert.equal(detail(360).raw_longitude,360);
 assert.equal(detail(-1).longitude,359);assert.equal(detail(721).longitude,1);
});
test('boundary sensitivity and motion preserve numeric evidence',()=>{
 assert.equal(detail(0.1).sign_boundary_sensitive,true);assert.equal(detail(0.100001).sign_boundary_sensitive,false);
 assert.equal(detail(29.95).sign_boundary_sensitive,true);
 for(const [speed,motion] of [[-1,'RETROGRADE'],[1,'DIRECT'],[0,'ZERO_SPEED'],[-1e-15,'RETROGRADE']]) {
  const p=detail(10,speed);assert.equal(p.motion,motion);assert.equal(p.longitude_speed,speed);assert.equal(p.station_sensitive,null);
 }
});
test('failed planets have no invented details and source remains unchanged',()=>{
 const input={positions:[{body:'MOON',status:'UNAVAILABLE',error:'TEST'},{body:'SUN',status:'VALID',longitude:280,longitude_speed:1}]};
 const before=structuredClone(input),r=withPlanetDetails(input);
 assert.deepEqual(input,before);assert.deepEqual(r.positions[0],input.positions[0]);assert.equal(r.positions[1].sign_name,'山羊座');
});
