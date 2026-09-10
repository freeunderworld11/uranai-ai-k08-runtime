import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateAspects} from '../src/aspects.js';
import {BODIES} from '../src/calculation.js';
const positions=(a,b)=>BODIES.map((body,i)=>({body,status:'VALID',longitude:i===0?a:i===1?b:15*i}));
const pair=(a,b)=>calculateAspects(positions(a,b)).pairs[0];
test('all five fixed orbs include the limit and exclude just outside',()=>{
 for(const [name,angle,orb] of [['CONJUNCTION',0,8],['SEXTILE',60,5],['SQUARE',90,7],['TRINE',120,7],['OPPOSITION',180,8]]) {
  const direction=angle===180?-1:1;
  assert.equal(pair(0,angle).aspect,name);assert.equal(pair(0,angle).exactness_ratio,1);
  const limit=pair(0,angle+direction*orb);assert.equal(limit.status,'FORMED');assert.equal(limit.exactness_ratio,0);
  assert.equal(pair(0,angle+direction*(orb+0.000001)).status,'NOT_FORMED');
 }
});
test('wrapped longitude, strength cutoffs and 45 unique pairs',()=>{
 assert.equal(pair(359,1).angle_distance,2);assert.equal(pair(-1,721).angle_distance,2);
 assert.equal(pair(0,2).strength,'TIGHT');assert.equal(pair(0,3).strength,'MODERATE');assert.equal(pair(0,6).strength,'WIDE');
 assert.equal(pair(0,63).exactness_ratio,0.4);assert.equal(pair(0,63).strength,'MODERATE');assert.equal(pair(0,63.000001).strength,'WIDE');
 const r=calculateAspects(positions(0,60));assert.equal(r.pair_count,45);
 assert.equal(new Set(r.pairs.map(p=>p.body_a+':'+p.body_b)).size,45);assert.ok(r.pairs.every(p=>p.body_a!==p.body_b));
 assert.equal(r.applying_separating_engine,'INACTIVE');
});
test('one failed planet removes only its nine pairs, not the other 36',()=>{
 const p=positions(0,60);p[1]={body:'MOON',status:'UNAVAILABLE'};
 const before=structuredClone(p);const r=calculateAspects(p);
 assert.equal(r.available_pair_count,36);assert.equal(r.pairs.filter(p=>p.status==='UNAVAILABLE').length,9);assert.deepEqual(p,before);
 assert.equal(calculateAspects(BODIES.map(body=>({body,status:'UNAVAILABLE'}))).available_pair_count,0);
});
