// SPDX-License-Identifier: AGPL-3.0-only
import {calculateAspects} from './aspects.js';

// Reuse actual evaluated instants; do not invent a representative birth time.
export function calculateAspectRange(samples,toUTC) {
  let pairs;
  const ordered=[...samples].sort(([a],[b])=>a-b);
  for(const [offset,sample] of ordered) {
    const current=calculateAspects(sample.positions).pairs;
    pairs??=current.map(p=>({body_a:p.body_a,body_b:p.body_b,observed_states:[],failed_sample_count:0,valid_sample_count:0}));
    current.forEach((p,i)=>{
      const target=pairs[i];
      if(p.status==='UNAVAILABLE'){target.failed_sample_count++;return;}
      target.valid_sample_count++;
      const state=p.status==='FORMED'?p.aspect:'NOT_FORMED';
      const seen=target.observed_states.find(x=>x.state===state);
      if(seen){seen.sample_count++;seen.last_observed_utc=toUTC(offset);}
      else target.observed_states.push({state,sample_count:1,first_observed_utc:toUTC(offset),last_observed_utc:toUTC(offset)});
    });
  }
  for(const p of pairs??[]) {
    const changed=p.observed_states.length>1;
    p.status=changed?'TIME_DEPENDENT':p.failed_sample_count?'UNAVAILABLE':'CONDITIONAL';
    p.ASPECT_STATUS=p.status;
    p.STABLE_WITHOUT_TIME=changed?false:null;
    p.all_transitions_certified=false;
  }
  return {scope:'EXPLICIT_UTC_RANGE',method:'SAMPLED_STATES',pair_count:pairs?.length??0,
    evaluated_sample_count:ordered.length,applying_separating_engine:'INACTIVE',source_class:'P3_NEW_STANDARD_FIXED',
    pairs:pairs??[],limitations:['SAMPLED_ASPECT_AGREEMENT_IS_NOT_PROOF','ASPECT_TRANSITION_TIMES_NOT_REFINED']};
}
