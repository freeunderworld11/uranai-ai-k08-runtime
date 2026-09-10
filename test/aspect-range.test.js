import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateAspectRange} from '../src/aspect-range.js';
import {BODIES} from '../src/calculation.js';
const sample=angle=>({positions:BODIES.map((body,i)=>({body,status:'VALID',longitude:i===1?angle:0}))});
const utc=t=>new Date(Date.UTC(2000,0,1)+t).toISOString();
test('interior changes count even with equal endpoints and unsorted refinement samples',()=>{
 const r=calculateAspectRange(new Map([[0,sample(60)],[2000,sample(60)],[1000,sample(70)]]),utc);
 const p=r.pairs[0];assert.equal(p.status,'TIME_DEPENDENT');assert.equal(p.STABLE_WITHOUT_TIME,false);
 assert.deepEqual(p.observed_states.map(s=>s.state),['SEXTILE','NOT_FORMED']);
 assert.equal(p.observed_states[0].last_observed_utc,utc(2000));assert.equal(r.pair_count,45);
});
test('aspect type changes are dependent while agreement is never certified',()=>{
 const r=calculateAspectRange([[0,sample(60)],[1000,sample(90)]],utc);
 assert.equal(r.pairs[0].status,'TIME_DEPENDENT');
 for(const angle of [60,70]) {
  const p=calculateAspectRange([[0,sample(angle)],[1000,sample(angle)]],utc).pairs[0];
  assert.equal(p.status,'CONDITIONAL');assert.equal(p.STABLE_WITHOUT_TIME,null);
 }
});
test('partial failures affect only dependent pairs and never count as not formed',()=>{
 const bad=sample(60);bad.positions[1]={body:'MOON',status:'UNAVAILABLE'};
 const r=calculateAspectRange([[0,sample(60)],[1000,bad]],utc);
 assert.equal(r.pairs.filter(p=>p.status==='UNAVAILABLE').length,9);
 assert.equal(r.pairs.filter(p=>p.status==='CONDITIONAL').length,36);
 assert.deepEqual(r.pairs[0].observed_states.map(s=>s.state),['SEXTILE']);
 const changed=calculateAspectRange([[0,sample(60)],[1000,sample(70)],[2000,bad]],utc).pairs[0];
 assert.equal(changed.status,'TIME_DEPENDENT');assert.equal(changed.failed_sample_count,1);
});
