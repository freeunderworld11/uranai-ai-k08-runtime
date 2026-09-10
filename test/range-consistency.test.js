import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptRange} from '../src/time-range.js';
import {k02} from './fixtures/k02.js';
const source={...k02,TIME_PRECISION:'UNKNOWN',NORMALIZED_BIRTH_TIME:null,LOCAL_CIVIL_DATETIME:null,UTC_DATETIME:null};
const day={k02:source,start_utc:'2000-01-01T00:00:00Z',end_utc:'2000-01-01T23:59:59Z'};
test('unknown time must cover local day and never a substituted instant',()=>{
 assert.equal(adaptRange(day).consistency.range_consistency_status,'CONDITIONAL');
 for(const change of [{end_utc:'2000-01-01T12:00:00Z'},{end_utc:'2000-01-02T00:00:00Z'},{k02:{...source,NORMALIZED_BIRTH_DATE:'2000-01-02'}},{k02:{...source,NORMALIZED_BIRTH_TIME:'12:00:00'}},{k02:{...source,UTC_DATETIME:day.start_utc}}])assert.throws(()=>adaptRange({...day,...change}));
});
test('Tokyo local day correctly spans different UTC dates',()=>{
 const r=adaptRange({...day,k02:{...source,TIMEZONE_ID:'Asia/Tokyo'},start_utc:'1999-12-31T15:00:00Z',end_utc:'2000-01-01T14:59:59Z'});
 assert.equal(r.consistency.verified_local_range.start_local,'2000-01-01T00:00:00');
});
test('DST days can span 23 and 25 hours',()=>{
 for(const [date,start,end,hours] of [['2024-03-10','05:00:00','03:59:59',23],['2024-11-03','04:00:00','04:59:59',25]]) {
  const next=date==='2024-03-10'?'2024-03-11':'2024-11-04';
  const r=adaptRange({k02:{...source,NORMALIZED_BIRTH_DATE:date,TIMEZONE_ID:'America/New_York'},start_utc:date+'T'+start+'Z',end_utc:next+'T'+end+'Z'});
  assert.equal(r.duration,hours*3600000-1000);
 }
});
test('hour precision rejects a narrower or different hour range',()=>{
 const r={...day,k02:{...source,TIME_PRECISION:'HOUR',NORMALIZED_BIRTH_TIME:'14'},start_utc:'2000-01-01T14:00:00Z',end_utc:'2000-01-01T14:59:59Z'};
 assert.ok(adaptRange(r).consistency);
 assert.throws(()=>adaptRange({...r,end_utc:'2000-01-01T14:30:00Z'}));
 assert.throws(()=>adaptRange({...r,k02:{...r.k02,NORMALIZED_BIRTH_TIME:'14:00:00'}}));
});
test('approximate precision requires explicit matching local limits',()=>{
 const r={...day,k02:{...source,TIME_PRECISION:'APPROXIMATE'},start_utc:'2000-01-01T13:30:00Z',end_utc:'2000-01-01T14:30:00Z'};
 assert.throws(()=>adaptRange(r));
 const local_range={start_local:'2000-01-01T13:30:00',end_local:'2000-01-01T14:30:00'};
 assert.ok(adaptRange({...r,local_range}).consistency);
 assert.throws(()=>adaptRange({...r,local_range:{...local_range,end_local:'2000-01-01T15:00:00'}}));
});
const overnight={k02:{...source,TIME_PRECISION:'APPROXIMATE',NORMALIZED_BIRTH_TIME:'00:15',LOCAL_CIVIL_DATETIME:'2000-01-01T00:15:00'},start_utc:'1999-12-31T23:30:00Z',end_utc:'2000-01-01T01:00:00Z',local_range:{start_local:'1999-12-31T23:30:00',end_local:'2000-01-01T01:00:00'}};
test('explicit overnight range preserves approximate center and original precision',()=>{
 const original=structuredClone(overnight);const r=adaptRange(overnight);
 assert.deepEqual(r.input_echo,original);assert.deepEqual(overnight,original);assert.equal(r.duration,5400000);
 assert.equal(r.input_echo.k02.TIME_PRECISION,'APPROXIMATE');
 assert.ok(adaptRange({...overnight,k02:{...overnight.k02,NORMALIZED_BIRTH_TIME:null,LOCAL_CIVIL_DATETIME:null}}).consistency);
});
test('approximate center must match its fields and be inside explicit limits',()=>{
 for(const patch of [{NORMALIZED_BIRTH_TIME:'02:00',LOCAL_CIVIL_DATETIME:null},{LOCAL_CIVIL_DATETIME:'2000-01-01T00:30:00'},{NORMALIZED_BIRTH_TIME:'24:00'},{NORMALIZED_BIRTH_TIME:null},{NORMALIZED_BIRTH_DATE:'2000-02-30'}])assert.throws(()=>adaptRange({...overnight,k02:{...overnight.k02,...patch}}));
 assert.throws(()=>adaptRange({...overnight,local_range:undefined}));
});
