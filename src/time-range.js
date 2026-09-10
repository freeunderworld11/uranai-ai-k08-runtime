// SPDX-License-Identifier: AGPL-3.0-only
import {adaptK02} from './k02-adapter.js';
import {BODIES, calculateWith, CalculationError} from './calculation.js';
import {refineSignBoundaries,signIndex} from './sign-boundaries.js';
import {checkRangeConsistency} from './range-consistency.js';
import {calculateAspectRange} from './aspect-range.js';
import {refineAspectBoundaries} from './aspect-boundaries.js';

// This envelope is an adapter extension, not part of the canonical K02 fields.
export function adaptRange(input) {
  if(!input || typeof input!=='object' || Array.isArray(input) || !['end_utc,k02,start_utc','end_utc,k02,local_range,start_utc'].includes(Object.keys(input).sort().join(',')))throw new CalculationError('RANGE_SCHEMA_ERROR',400);
  const source=input.k02;
  adaptK02(source); // Validate the original schema before deriving endpoint requests.
  if(!['HOUR','APPROXIMATE','UNKNOWN'].includes(source.TIME_PRECISION))throw new CalculationError('RANGE_PRECISION_INVALID',400);
  const endpoints=[input.start_utc,input.end_utc].map(utc=>adaptK02({...source,TIME_PRECISION:'SECOND',UTC_DATETIME:utc},{rangeEndpoint:true}));
  const blocked=endpoints.find(e=>!e.utc_parts);
  const echo={input_echo:structuredClone(input),input_contract:'K02_TO_K08_ASTRO_TIME_GEO_v1',range_contract:'K08_EXPLICIT_UTC_RANGE_v3'};
  if(blocked)return {...echo,result_status:'UNAVAILABLE',limitations:blocked.limitations};
  const duration=Date.parse(input.end_utc)-Date.parse(input.start_utc);
  if(duration<=0 || duration>26*3600000)throw new CalculationError('RANGE_DURATION_INVALID',422);
  return {...echo,endpoints,duration,consistency:checkRangeConsistency(input)};
}

export function calculateRangeWith(swe,gate) {
  if(gate.result_status==='UNAVAILABLE')return gate;
  const jd=gate.endpoints.map(({utc_parts:p})=>swe.julianDay(p.year,p.month,p.day,p.hour));
  const intervals=Math.ceil(gate.duration/300000);
  const summary=BODIES.map(body=>({body,status:'CONDITIONAL',observed_sign_indices:[],failed_sample_count:0,SIGN_STABLE_WITHOUT_TIME:null,SIGN_TIME_DEPENDENT:null}));
  const cache=new Map();
  let budgetExhausted=false;
  function evaluate(offset) {
    if(cache.has(offset))return cache.get(offset);
    if(cache.size>=2048){budgetExhausted=true;return null;}
    const sample=calculateWith(swe,{jd_ut:offset===gate.duration?jd[1]:jd[0]+offset/86400000},{skipHouses:true});
    cache.set(offset,sample);
    for(let b=0;b<summary.length;b++) {
      const target=summary[b],p=sample.positions[b];
      if(p.status!=='VALID'){target.failed_sample_count++;continue;}
      const sign=signIndex(p.longitude);
      if(!target.observed_sign_indices.includes(sign))target.observed_sign_indices.push(sign);
    }
    return sample;
  }
  const times=Array.from({length:intervals+1},(_,i)=>gate.duration*i/intervals);
  times.forEach(evaluate);
  const start=Date.parse(gate.input_echo.start_utc);
  const toUTC=offset=>new Date(Math.round(start+offset)).toISOString();
  summary.forEach((p,b)=>Object.assign(p,refineSignBoundaries(times,evaluate,b,toUTC)));
  const aspectBoundaries=refineAspectBoundaries([...cache.keys()].sort((a,b)=>a-b),evaluate,toUTC);
  const aspects=calculateAspectRange(cache,toUTC);
  aspects.pairs.forEach((p,i)=>Object.assign(p,aspectBoundaries[i]));
  aspects.method='SAMPLED_STATES_WITH_BRACKET_REFINEMENT';
  aspects.limitations=['SAMPLED_ASPECT_AGREEMENT_IS_NOT_PROOF','ASPECT_BOUNDARY_WIDTH_IS_NOT_ABSOLUTE_TIME_ACCURACY'];
  for(const p of summary) {
    if(p.observed_sign_indices.length>1){p.status='TIME_DEPENDENT';p.SIGN_TIME_DEPENDENT=true;p.SIGN_STABLE_WITHOUT_TIME=false;}
    else if(p.failed_sample_count)p.status='UNAVAILABLE';
    // Sample agreement cannot certify stability between samples.
  }
  return {input_echo:gate.input_echo,input_contract:gate.input_contract,range_contract:gate.range_contract,
    ...gate.consistency,
    result_status:summary.some(p=>p.status!=='UNAVAILABLE')?'PARTIAL':'UNAVAILABLE',
    time_status:'CONDITIONAL',positions:summary,sample_count:intervals+1,max_sample_spacing_seconds:300,
    aspects,
    evaluated_sample_count:cache.size,max_evaluated_samples:2048,boundary_bracket_tolerance_seconds:1,search_budget_exhausted:budgetExhausted,
    houses:{status:'UNAVAILABLE_TIME_RANGE',asc_status:'UNAVAILABLE',mc_status:'UNAVAILABLE'},
    limitations:[...new Set(gate.endpoints.flatMap(e=>e.limitations)),...gate.consistency.range_consistency_limitations,'SAMPLED_SIGN_AGREEMENT_IS_NOT_PROOF','BOUNDARY_BRACKET_WIDTH_IS_NOT_ABSOLUTE_TIME_ACCURACY','HOUSE_RANGE_VALIDATION_PENDING','ASPECT_RANGE_CERTIFICATION_PENDING',...(budgetExhausted?['BOUNDARY_SEARCH_BUDGET_EXHAUSTED']:[])]};
}
