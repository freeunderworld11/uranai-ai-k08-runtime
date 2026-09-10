// SPDX-License-Identifier: AGPL-3.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BODIES} from '../src/calculation.js';
import {calculateAspects} from '../src/aspects.js';
import {withK08Result} from '../src/k08-result.js';
const planets=()=>BODIES.map((body,i)=>({body,status:'VALID',longitude:i*31,house_status:'VALID',house:i%12+1}));
test('K19 audit requires ten distinct planet identities and valid house numbers',()=>{
 const positions=planets();assert.equal(withK08Result({positions}).K08_AUDIT.TEN_PLANETS_VALID,true);
 const duplicate=positions.map(p=>({...p,body:'SUN'}));
 assert.equal(withK08Result({positions:duplicate}).K08_AUDIT.TEN_PLANETS_VALID,false);
 assert.equal(withK08Result({positions:duplicate}).K08_AUDIT.PLANET_HOUSES_VALID,false);
 for(const house of [0,13,1.5,null])assert.equal(withK08Result({positions:positions.map((p,i)=>i? p:{...p,house})}).K08_AUDIT.PLANET_HOUSES_VALID,false);
});
test('K19 audit requires all 45 distinct unordered pairs, not just 45 records',()=>{
 const aspects=calculateAspects(planets());
 const audit=pairs=>withK08Result({aspects:{pairs}}).K08_AUDIT.ASPECT_45_PAIRS_VALID;
 assert.equal(audit(aspects.pairs),true);
 assert.equal(audit(aspects.pairs.map(p=>({...p,body_a:p.body_b,body_b:p.body_a}))),true);
 for(const bad of [aspects.pairs.slice(1),Array(45).fill(aspects.pairs[0]),[{body_a:'SUN',body_b:'SUN'},...aspects.pairs.slice(1)],[{body_a:'UNKNOWN',body_b:'MOON'},...aspects.pairs.slice(1)]])assert.equal(audit(bad),false);
 assert.equal(withK08Result({}).K08_AUDIT.ASPECT_45_PAIRS_VALID,null);
});
test('K19 structural checks cannot approve deployment or downstream interpretation',()=>{
 const positions=planets(),out=withK08Result({positions,aspects:calculateAspects(positions)});
 assert.equal(out.K08_AUDIT.ASPECT_45_PAIRS_VALID,true);
 assert.equal(out.K08_AUDIT.REGRESSION_SUITE_VALID,null);assert.equal(out.K08_AUDIT.OVERALL,'FAIL');
 assert.equal(out.K09_USAGE_STATUS,'LOCAL_BLOCK');assert.equal(out.K08_STATUS,'RUNTIME_NOT_APPROVED');
});
