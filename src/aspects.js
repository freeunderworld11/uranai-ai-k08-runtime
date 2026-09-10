// SPDX-License-Identifier: AGPL-3.0-only
import {BODIES} from './calculation.js';
const rules=[['CONJUNCTION',0,8],['SEXTILE',60,5],['SQUARE',90,7],['TRINE',120,7],['OPPOSITION',180,8]];
const normalize=x=>((x%360)+360)%360;
export function calculateAspects(positions) {
  const pairs=[];
  for(let i=0;i<BODIES.length;i++)for(let j=i+1;j<BODIES.length;j++) {
    const pair={body_a:BODIES[i],body_b:BODIES[j]};
    const a=positions[i],b=positions[j];
    if(a?.body!==pair.body_a || b?.body!==pair.body_b || a.status!=='VALID' || b.status!=='VALID' || !Number.isFinite(a.longitude) || !Number.isFinite(b.longitude)) {
      pairs.push({...pair,status:'UNAVAILABLE',error:'DEPENDENT_PLANET_UNAVAILABLE'});continue;
    }
    const d=Math.abs(normalize(a.longitude)-normalize(b.longitude));
    const angle_distance=Math.min(d,360-d);
    const rule=rules.find(([,angle,orb])=>Math.abs(angle_distance-angle)<=orb);
    if(!rule){pairs.push({...pair,status:'NOT_FORMED',angle_distance});continue;}
    const [aspect,exact_angle,orb]=rule;
    const delta=Math.abs(angle_distance-exact_angle);
    const exactness_ratio=Math.max(0,Math.min(1,1-delta/orb));
    pairs.push({...pair,status:'FORMED',angle_distance,aspect,exact_angle,orb,delta,exactness_ratio,
      strength:exactness_ratio>=0.75?'TIGHT':exactness_ratio>=0.4?'MODERATE':'WIDE'});
  }
  return {scope:'SINGLE_INSTANT',source_class:'P3_NEW_STANDARD_FIXED',applying_separating_engine:'INACTIVE',
    pair_count:pairs.length,available_pair_count:pairs.filter(p=>p.status!=='UNAVAILABLE').length,
    formed_pair_count:pairs.filter(p=>p.status==='FORMED').length,pairs};
}
export function withAspects(result) {return {...result,aspects:calculateAspects(result.positions)};}
