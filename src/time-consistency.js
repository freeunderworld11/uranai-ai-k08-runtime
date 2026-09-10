// SPDX-License-Identifier: AGPL-3.0-only
import {CalculationError} from './calculation.js';
export function checkTimeConsistency(source) {
  const fail=code=>{throw new CalculationError(code,422);};
  const date=source.NORMALIZED_BIRTH_DATE,time=source.NORMALIZED_BIRTH_TIME;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date??'') || typeof time!=='string')fail('K02_LOCAL_DATETIME_INVALID');
  const pattern=source.TIME_PRECISION==='MINUTE'?/^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/:/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
  if(!pattern.test(time))fail('K02_TIME_PRECISION_CONFLICT');
  const normalizedTime=time.length===5?time+':00':time;
  const local=`${date}T${normalizedTime}`;
  if(source.LOCAL_CIVIL_DATETIME!==local)fail('K02_LOCAL_DATETIME_MISMATCH');
  const localTimestamp=Date.parse(local+'Z');
  if(!Number.isFinite(localTimestamp)||new Date(localTimestamp).toISOString().slice(0,19)!==local)fail('K02_LOCAL_DATETIME_INVALID');
  const m=/^([+-])(\d{2}):([0-5]\d)(?::([0-5]\d))?$/.exec(source.UTC_OFFSET_EFFECTIVE??'');
  if(!m||Number(m[2])>23)fail('K02_OFFSET_FORMAT_INVALID');
  const seconds=(Number(m[2])*3600+Number(m[3])*60+Number(m[4]??0))*(m[1]==='-'?-1:1);
  if(localTimestamp-seconds*1000!==Date.parse(source.UTC_DATETIME))fail('K02_UTC_OFFSET_MISMATCH');
  return {time_consistency_status:'ARITHMETICALLY_CONSISTENT',derived_utc_offset_seconds:seconds,
    time_consistency_limitation:'TIMEZONE_RULE_AND_TZDB_VERSION_NOT_CERTIFIED'};
}
