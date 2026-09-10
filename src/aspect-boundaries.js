// SPDX-License-Identifier: AGPL-3.0-only
import {calculateAspects} from './aspects.js';
const state=p=>p?.status==='UNAVAILABLE'||!p?null:p.status==='FORMED'?p.aspect:'NOT_FORMED';

export function refineAspectBoundaries(times,evaluate,toUTC) {
  const cache=new Map();
  const pairsAt=t=>{
    if(cache.has(t))return cache.get(t);
    const sample=evaluate(t);
    const pairs=sample?calculateAspects(sample.positions).pairs:null;
    cache.set(t,pairs);return pairs;
  };
  const results=Array.from({length:45},()=>({transition_brackets:[],unresolved_interval_count:0,all_transitions_certified:false}));
  results.forEach((result,index)=>{
    function search(left,right) {
      const a=pairsAt(left)?.[index],b=pairsAt(right)?.[index];
      const from=state(a),to=state(b);
      if(from===null || to===null){result.unresolved_interval_count++;return;}
      if(from===to)return;
      if(right-left<=1000) {
        result.transition_brackets.push({start_utc:toUTC(left),end_utc:toUTC(right),width_seconds:(right-left)/1000,
          from_state:from,to_state:to,start_angle_distance:a.angle_distance,end_angle_distance:b.angle_distance,status:'BRACKETED'});
        return;
      }
      const mid=(left+right)/2;
      if(state(pairsAt(mid)?.[index])===null){result.unresolved_interval_count++;return;}
      search(left,mid);search(mid,right);
    }
    for(let i=1;i<times.length;i++)search(times[i-1],times[i]);
    result.boundary_search_status=result.unresolved_interval_count?'INCOMPLETE':'OBSERVED_TRANSITIONS_REFINED';
  });
  return results;
}
