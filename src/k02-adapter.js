// SPDX-License-Identifier: AGPL-3.0-only
import {CalculationError} from './calculation.js';
import {checkTimeConsistency} from './time-consistency.js';
import {timezoneAudit} from './timezone-audit.js';
export const K02_FIELDS = ['NORMALIZED_BIRTH_DATE','NORMALIZED_BIRTH_TIME','TIME_PRECISION','LOCAL_CIVIL_DATETIME','PLACE_NORMALIZED','LATITUDE','LONGITUDE','GEO_PRECISION','GEO_STATUS','TIMEZONE_ID','TIMEZONE_STATUS','TZDB_VERSION','PRE_1970_CONFIDENCE','DST_STATUS','LOCAL_TIME_STATUS','UTC_OFFSET_EFFECTIVE','UTC_DATETIME','K02_AUDIT_STATUS','K02_VERSION'];
export function adaptK02(source,{rangeEndpoint=false}={}) {
  if (!source || typeof source !== 'object' || Array.isArray(source) || K02_FIELDS.some(k=>!Object.hasOwn(source,k)) || Object.keys(source).some(k=>!K02_FIELDS.includes(k))) throw new CalculationError('K02_SCHEMA_ERROR',400);
  for(const key of K02_FIELDS) {
    const value=source[key];
    if (['LATITUDE','LONGITUDE'].includes(key)) {
      if(value!==null && (typeof value!=='number'||!Number.isFinite(value)))throw new CalculationError('K02_SCHEMA_ERROR',400);
    } else if(value!==null && typeof value!=='string') throw new CalculationError('K02_SCHEMA_ERROR',400);
  }
  const input_echo=structuredClone(source);
  const timezone_audit=timezoneAudit(source);
  const limits=[];
  const blocked=reason=>({timezone_audit,input_echo,time_status:'LOCAL_BLOCK',geo_status:'LOCAL_BLOCK',limitations:[reason],utc_parts:null});
  if(source.K02_VERSION!=='K02_v2.4_PRODUCTION')return blocked('K02_VERSION_MISMATCH');
  if(!['PASS','PARTIAL_PASS'].includes(source.K02_AUDIT_STATUS))return blocked('K02_AUDIT_NOT_ACCEPTED');
  if(!['SECOND','MINUTE','HOUR','APPROXIMATE','UNKNOWN'].includes(source.TIME_PRECISION))throw new CalculationError('K02_TIME_PRECISION_INVALID',400);
  if(!['SECOND','MINUTE'].includes(source.TIME_PRECISION))return blocked('TIME_RANGE_NOT_IMPLEMENTED');
  if(source.LOCAL_TIME_STATUS!=='NORMAL')return blocked('LOCAL_TIME_UNRESOLVED');
  if(source.TIMEZONE_STATUS!=='CONFIRMED' || !source.TIMEZONE_ID || !source.TZDB_VERSION)return blocked('TIMEZONE_UNRESOLVED');
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(source.UTC_DATETIME??'');
  if(!m)throw new CalculationError('K02_UTC_INVALID',400);
  const [year,month,day,hour,minute,second]=m.slice(1,7).map(Number);
  const timestamp=Date.parse(source.UTC_DATETIME);
  const date=new Date(timestamp);
  if(!Number.isFinite(timestamp)||date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||date.getUTCDate()!==day||hour>23||minute>59||second>59)throw new CalculationError('K02_UTC_INVALID',400);
  if(year<1900||year>=2100)throw new CalculationError('DATE_OUT_OF_RANGE');
  if(year<1970 && !['HIGH','MEDIUM','LIMITED'].includes(source.PRE_1970_CONFIDENCE))return blocked('HISTORICAL_TIME_UNAVAILABLE');
  if(year<1970 && source.PRE_1970_CONFIDENCE!=='HIGH')limits.push('HISTORICAL_TIME_CONDITIONAL');
  if(source.TIME_PRECISION==='MINUTE')limits.push('MINUTE_PRECISION_SNAPSHOT_ONLY');
  if(source.K02_AUDIT_STATUS==='PARTIAL_PASS')limits.push('K02_PARTIAL_PASS');
  const geoValid=source.GEO_STATUS==='CONFIRMED' && ['EXACT','CITY_CENTER'].includes(source.GEO_PRECISION) && Number.isFinite(source.LATITUDE)&&Math.abs(source.LATITUDE)<=90&&Number.isFinite(source.LONGITUDE)&&Math.abs(source.LONGITUDE)<=180;
  if(!geoValid)limits.push('GEO_DEPENDENT_RESULTS_BLOCKED');
  return {timezone_audit,...(rangeEndpoint?{}:checkTimeConsistency(source)),input_echo,time_status:limits.some(x=>x!=='GEO_DEPENDENT_RESULTS_BLOCKED')?'CONDITIONAL':'VALID',geo_status:geoValid?'VALID':'LOCAL_BLOCK',limitations:limits,utc_parts:{year,month,day,hour:hour+minute/60+(second+Number('0.'+(m[7]??'0')))/3600}};
}
