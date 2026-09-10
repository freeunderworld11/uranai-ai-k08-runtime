// SPDX-License-Identifier: AGPL-3.0-only
import {CalculationError} from './calculation.js';
const fields=['TARGET_SOLAR_LONGITUDE_DEG','SEARCH_START_UTC','SEARCH_END_UTC','TIME_SCALE_REQUIREMENT','K02_VERSION'];
function utc(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value))throw new CalculationError('SOLAR_UTC_INVALID',400);
  const t=Date.parse(value);
  if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,19)+'Z'!==value)throw new CalculationError('SOLAR_UTC_INVALID',400);
  if(t<Date.UTC(1900,0,1)||t>=Date.UTC(2100,0,1))throw new CalculationError('DATE_OUT_OF_RANGE');
  return t;
}
export function validateSolarInput(s) {
  if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).length!==5||fields.some(k=>!Object.hasOwn(s,k)))throw new CalculationError('SOLAR_SCHEMA_ERROR',400);
  if(s.K02_VERSION!=='K02_v2.4_PRODUCTION')throw new CalculationError('K02_VERSION_MISMATCH');
  if(s.TIME_SCALE_REQUIREMENT!=='UT')throw new CalculationError('SOLAR_TIME_SCALE_UNSUPPORTED');
  const target=s.TARGET_SOLAR_LONGITUDE_DEG;
  if(!Number.isFinite(target)||target<0||target>=360)throw new CalculationError('SOLAR_TARGET_INVALID',400);
  const start=utc(s.SEARCH_START_UTC),end=utc(s.SEARCH_END_UTC);
  if(end<=start||end-start>32*86400000)throw new CalculationError('SOLAR_SEARCH_RANGE_INVALID');
  return {start,end,target};
}
export function solarBoundaryWith(swe,input) {
  const {start,end,target}=validateSolarInput(input);
  const base={SERVICE_ID:'K08_SOLAR_LONGITUDE_BOUNDARY_SERVICE_v1',TARGET_SOLAR_LONGITUDE_DEG:target,input_echo:structuredClone(input),ENGINE_NAME:'SWISS_EPHEMERIS',ENGINE_VERSION:swe.version,EPHEMERIS_VERSION:'@kuntay/swisseph-data@0.2.2',K08_VERSION:'K08_v2.2_PRODUCTION'};
  if(swe.version!=='2.10.03')throw new CalculationError('RUNTIME_VERSION_MISMATCH',503);
  const unresolved=reason=>({...base,result_status:'UNAVAILABLE',CALCULATION_STATUS:'UNRESOLVED',CONFIDENCE_STATUS:'UNAVAILABLE',reason});
  function sample(t) {
    const d=new Date(t),jd=swe.julianDay(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours()+d.getUTCMinutes()/60+(d.getUTCSeconds()+d.getUTCMilliseconds()/1000)/3600);
    let p;
    try{p=swe.calc(jd,0,{ephemeris:'swiss'});}catch(e){if(e?.name==='SwissEphError'&&e.fn==='swe_calc_ut')return null;throw new CalculationError('GLOBAL_RUNTIME_FAIL',503);}
    if(!p||!Number.isInteger(p.returnFlags)||typeof p.ephemeris!=='string')throw new CalculationError('GLOBAL_RUNTIME_FAIL',503);
    if(p.returnFlags!==258||p.ephemeris!=='swiss'||p.warning||!Number.isFinite(p.longitude)||p.longitude<0||p.longitude>=360||!Number.isFinite(p.longitudeSpeed)||p.longitudeSpeed<=0)return null;
    return {longitude:p.longitude,difference:((p.longitude-target+540)%360)-180};
  }
  const count=Math.ceil((end-start)/21600000),samples=[];
  for(let i=0;i<=count;i++){const t=start+(end-start)*i/count,p=sample(t);if(!p)return unresolved('SOLAR_SAMPLE_REJECTED');samples.push({t,...p});}
  const brackets=[];
  for(let i=0;i<samples.length;i++) {
    const p=samples[i];if(p.difference===0)brackets.push([p.t,p.t]);
    if(i&&samples[i-1].difference<0&&p.difference>0)brackets.push([samples[i-1].t,p.t]);
  }
  if(brackets.length!==1)return unresolved(brackets.length?'MULTIPLE_CROSSINGS':'NO_CROSSING');
  let [lo,hi]=brackets[0];
  while(hi-lo>100){const mid=Math.floor((lo+hi)/2),p=sample(mid);if(!p)return unresolved('SOLAR_REFINEMENT_REJECTED');if(p.difference===0){lo=hi=mid;break;}if(p.difference<0)lo=mid;else hi=mid;}
  const t=Math.round((lo+hi)/2),p=sample(t);if(!p)return unresolved('SOLAR_FINAL_SAMPLE_REJECTED');
  return {...base,result_status:'PARTIAL',CALCULATION_STATUS:'CALCULATED',CONFIDENCE_STATUS:'CONDITIONAL',BOUNDARY_UTC_DATETIME:new Date(t).toISOString(),SOLAR_LONGITUDE_AT_BOUNDARY:p.longitude,
    BOUNDARY_BRACKET_UTC:[new Date(lo).toISOString(),new Date(hi).toISOString()],BRACKET_WIDTH_SECONDS:(hi-lo)/1000,
    limitations:['NUMERICAL_BRACKET_NOT_ABSOLUTE_UTC_ACCURACY','K19_ACCEPTANCE_PENDING','UTC_TO_JD_UT_CONVENTION_NOT_INDEPENDENTLY_CERTIFIED']};
}
