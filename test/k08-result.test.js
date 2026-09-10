// SPDX-License-Identifier: AGPL-3.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withK08Result} from '../src/k08-result.js';
test('formal result preserves healthy values and suppresses rejected planet values',()=>{
 const input={result_status:'PARTIAL',jd_ut:2451545,positions:[{body:'SUN',status:'VALID',longitude:280,latitude:0,longitude_speed:1,house:5},{body:'MOON',status:'UNAVAILABLE',longitude:99,error:'EPHEMERIS_FALLBACK_REJECTED'}]};
 const before=structuredClone(input),out=withK08Result(input),p=out.K08_NATAL_RESULT.PLANETS;
 assert.deepEqual(input,before);assert.equal(p.SUN.LONGITUDE,280);assert.equal(p.MOON.LONGITUDE,null);
 assert.ok(p.MOON.LIMITATION.includes('EPHEMERIS_FALLBACK_REJECTED'));
 assert.equal(out.K09_USAGE_STATUS,'LOCAL_BLOCK');assert.equal(out.K08_AUDIT.OVERALL,'FAIL');
 assert.equal(out.K08_AUDIT.REGRESSION_SUITE_VALID,null);assert.deepEqual(out.AVAILABLE_COMPONENTS.PLANETS,['SUN']);
});
test('conditional polar angles remain labelled and cannot supply alternative cusps',()=>{
 const out=withK08Result({houses:{status:'UNAVAILABLE_PLACIDUS',asc:299,asc_status:'CONDITIONAL',mc_status:'UNAVAILABLE',cusps:Array(12).fill(5)}});
 assert.equal(out.K08_NATAL_RESULT.ANGLES.ASC_STATUS,'CONDITIONAL');assert.equal(out.K08_NATAL_RESULT.ANGLES.ASC,299);
 assert.equal(out.K08_HOUSE_RESULT.CUSP_1,null);assert.equal(out.K08_NATAL_RESULT.HOUSES.CUSPS,null);assert.equal(out.K08_AUDIT.ASC_VALID,null);
});
test('range output preserves original evidence without inventing a representative longitude',()=>{
 const input={range_contract:'K08_EXPLICIT_UTC_RANGE_v3',input_echo:{k02:{TIME_PRECISION:'UNKNOWN',UTC_DATETIME:null}},positions:[{body:'SUN',status:'CONDITIONAL',observed_sign_indices:[9]}]};
 const out=withK08Result(input);
 assert.equal(out.K08_NATAL_RESULT.PLANETS.SUN.LONGITUDE,null);assert.equal(out.K08_NATAL_RESULT.PLANETS.SUN.JULIAN_DAY_UT,null);
 assert.deepEqual(out.positions,input.positions);assert.equal(out.K08_NATAL_RESULT.TIME.TIME_PRECISION,'UNKNOWN');
 assert.equal(out.K08_AUDIT.TEN_PLANETS_VALID,null);assert.equal(out.AVAILABLE_COMPONENTS.RANGE_EVIDENCE,true);
});
test('blocked inputs do not acquire planets or a passing audit',()=>{
 const out=withK08Result({result_status:'UNAVAILABLE'});
 assert.equal(Object.keys(out.K08_NATAL_RESULT.PLANETS).length,10);
 assert.ok(Object.values(out.K08_NATAL_RESULT.PLANETS).every(p=>p.STATUS==='UNAVAILABLE'&&p.LONGITUDE===null));
 assert.equal(out.K08_AUDIT.DEPLOYMENT_GATE_VALID,false);assert.equal(out.K08_NATAL_RESULT.OVERALL_STATUS,'RUNTIME_NOT_APPROVED');
});
