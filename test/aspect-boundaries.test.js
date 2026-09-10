import test from 'node:test';
import assert from 'node:assert/strict';
import {refineAspectBoundaries} from '../src/aspect-boundaries.js';
import {BODIES} from '../src/calculation.js';
const utc=t=>new Date(Date.UTC(2000,0,1)+Math.round(t)).toISOString();
const sample=angle=>({positions:BODIES.map((body,i)=>({body,status:'VALID',longitude:i===1?angle:0}))});
test('formation and loss of aspect bracket analytic roots within one second',()=>{
 for(const direction of [1,-1]) {
  const root=123456;
  const p=refineAspectBoundaries([0,300000],t=>sample(65+direction*(t-root)/100000),utc)[0];
  assert.equal(p.transition_brackets.length,1);const b=p.transition_brackets[0];
  assert.ok(b.width_seconds<=1);assert.ok(Date.parse(b.start_utc)<=Date.parse(utc(root)));assert.ok(Date.parse(b.end_utc)>=Date.parse(utc(root)));
  assert.equal(b.from_state,direction===1?'SEXTILE':'NOT_FORMED');assert.equal(b.to_state,direction===1?'NOT_FORMED':'SEXTILE');
 }
});
test('different aspect types retain intermediate not-formed state',()=>{
 const p=refineAspectBoundaries([0,300000],t=>sample(60+t/10000),utc)[0];
 assert.equal(p.transition_brackets.length,2);
 assert.deepEqual(p.transition_brackets.map(b=>[b.from_state,b.to_state]),[['SEXTILE','NOT_FORMED'],['NOT_FORMED','SQUARE']]);
});
test('failed midpoint or exhausted evaluator never creates a boundary',()=>{
 const r=refineAspectBoundaries([0,300000],t=>t===0?sample(60):t===300000?sample(70):null,utc);
 assert.equal(r[0].transition_brackets.length,0);assert.equal(r[0].boundary_search_status,'INCOMPLETE');
 assert.equal(r[1].boundary_search_status,'OBSERVED_TRANSITIONS_REFINED');
 assert.equal(r[1].all_transitions_certified,false);
});
