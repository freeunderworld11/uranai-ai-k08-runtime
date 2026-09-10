// SPDX-License-Identifier: AGPL-3.0-only
import {CalculationError} from './calculation.js';
const fail=code=>{throw new CalculationError(code,422);};
export function checkRangeConsistency(input) {
  const s=input.k02;
  let formatter;
  try {formatter=new Intl.DateTimeFormat('en-GB',{timeZone:s.TIMEZONE_ID,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});}
  catch {fail('RANGE_TIMEZONE_UNSUPPORTED');}
  const local=utc=>{
    const p=Object.fromEntries(formatter.formatToParts(new Date(utc)).map(p=>[p.type,p.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  };
  if(Date.parse(input.start_utc)%1000 || Date.parse(input.end_utc)%1000)fail('RANGE_REQUIRES_WHOLE_SECONDS');
  const start=local(input.start_utc),end=local(input.end_utc),date=s.NORMALIZED_BIRTH_DATE;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date??''))fail('RANGE_BIRTH_DATE_INVALID');
  if(s.UTC_DATETIME!==null)fail('RANGE_SINGLE_UTC_NOT_ALLOWED');
  if(s.TIME_PRECISION==='UNKNOWN') {
    if(s.NORMALIZED_BIRTH_TIME!==null || s.LOCAL_CIVIL_DATETIME!==null)fail('UNKNOWN_TIME_MUST_BE_NULL');
    if(input.local_range!==undefined)fail('RANGE_UNEXPECTED_LOCAL_RANGE');
    if(start!==`${date}T00:00:00` || end!==`${date}T23:59:59`)fail('RANGE_LOCAL_DAY_MISMATCH');
  } else if(s.TIME_PRECISION==='HOUR') {
    // HH is the adapter's hour-only transport; never manufacture minute precision.
    if(!/^(?:[01]\d|2[0-3])$/.test(s.NORMALIZED_BIRTH_TIME??''))fail('RANGE_HOUR_FORMAT_INVALID');
    if(s.LOCAL_CIVIL_DATETIME!==null || input.local_range!==undefined)fail('RANGE_HOUR_PRECISION_CONFLICT');
    if(start!==`${date}T${s.NORMALIZED_BIRTH_TIME}:00:00` || end!==`${date}T${s.NORMALIZED_BIRTH_TIME}:59:59`)fail('RANGE_LOCAL_HOUR_MISMATCH');
    // Repeated/skipped local hours need an explicit disambiguation contract.
    if(Date.parse(input.end_utc)-Date.parse(input.start_utc)!==3599000)fail('RANGE_HOUR_DST_UNRESOLVED');
  } else {
    const r=input.local_range;
    if(!r || typeof r!=='object' || Array.isArray(r) || Object.keys(r).sort().join(',')!=='end_local,start_local')fail('APPROXIMATE_LOCAL_RANGE_REQUIRED');
    if(start!==r.start_local || end!==r.end_local || start>end)fail('RANGE_APPROXIMATE_MISMATCH');
    if(!start.startsWith(date+'T') || !end.startsWith(date+'T'))fail('RANGE_APPROXIMATE_DATE_MISMATCH');
    if(s.NORMALIZED_BIRTH_TIME!==null || s.LOCAL_CIVIL_DATETIME!==null)fail('APPROXIMATE_USE_EXPLICIT_RANGE');
  }
  return {range_consistency_status:'CONDITIONAL',range_consistency_method:'RUNTIME_INTL_ENDPOINT_CHECK',
    verified_local_range:{start_local:start,end_local:end},
    range_consistency_limitations:['RUNTIME_TZDB_VERSION_NOT_MATCHED_TO_K02','DST_AMBIGUITY_AUTHORITY_REMAINS_K02']};
}
