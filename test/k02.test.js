import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptK02} from '../src/k02-adapter.js';
import {k02} from './fixtures/k02.js';
test('K02 preserves authority and precision',()=>{
 const result=adaptK02(k02);assert.deepEqual(result.input_echo,k02);assert.equal(result.time_status,'VALID');
 assert.equal(adaptK02({...k02,TIME_PRECISION:'MINUTE'}).time_status,'CONDITIONAL');
 assert.equal(adaptK02({...k02,GEO_PRECISION:'LOCALITY_CENTER'}).geo_status,'LOCAL_BLOCK');
});
test('audit and uncertainty gates block time without substitution',()=>{
 for(const patch of [{K02_AUDIT_STATUS:'FAIL'},{K02_VERSION:'other'},{LOCAL_TIME_STATUS:'AMBIGUOUS'},{LOCAL_TIME_STATUS:'NONEXISTENT'},{TIME_PRECISION:'UNKNOWN'},{TIME_PRECISION:'HOUR'},{TIME_PRECISION:'APPROXIMATE'},{TIMEZONE_STATUS:'CONFLICT'},{UTC_DATETIME:'1960-01-01T00:00:00Z',PRE_1970_CONFIDENCE:'UNAVAILABLE'}])assert.equal(adaptK02({...k02,...patch}).time_status,'LOCAL_BLOCK');
});
test('invalid UTC and aliases are rejected',()=>{
 for(const UTC_DATETIME of ['2000-02-30T00:00:00Z','2000-01-01T24:00:00Z','2000-01-01T12:00:60Z','2000-01-01T12:00:00+00:00'])assert.throws(()=>adaptK02({...k02,UTC_DATETIME}),{code:'K02_UTC_INVALID'});
 assert.throws(()=>adaptK02({...k02,IANA_TIMEZONE_ID:'Europe/London'}),{code:'K02_SCHEMA_ERROR'});
});
