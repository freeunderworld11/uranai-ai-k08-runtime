import test from 'node:test';
import assert from 'node:assert/strict';
import {checkTimeConsistency} from '../src/time-consistency.js';
import {adaptK02} from '../src/k02-adapter.js';
import {k02} from './fixtures/k02.js';
test('offset arithmetic supports date rollover and second offsets without replacing source',()=>{
 for(const [offset,utc,seconds] of [['+09:00','1999-12-31T15:00:00Z',32400],['-05:00','2000-01-01T05:00:00Z',-18000],['+00:00:30','1999-12-31T23:59:30Z',30]]) {
  const source={...k02,NORMALIZED_BIRTH_TIME:'00:00:00',LOCAL_CIVIL_DATETIME:'2000-01-01T00:00:00',UTC_OFFSET_EFFECTIVE:offset,UTC_DATETIME:utc};
  const before=structuredClone(source),r=checkTimeConsistency(source);assert.deepEqual(source,before);assert.equal(r.derived_utc_offset_seconds,seconds);
 }
});
test('mismatching local date, offset, precision and invalid local calendar are rejected',()=>{
 for(const patch of [{NORMALIZED_BIRTH_DATE:'2000-01-02'},{UTC_OFFSET_EFFECTIVE:'+09:00'},{UTC_OFFSET_EFFECTIVE:'9'},{LOCAL_CIVIL_DATETIME:'2000-01-01T11:00:00'},{TIME_PRECISION:'MINUTE',NORMALIZED_BIRTH_TIME:'12:00:01'},{NORMALIZED_BIRTH_DATE:'2000-02-30',LOCAL_CIVIL_DATETIME:'2000-02-30T12:00:00'}])assert.throws(()=>adaptK02({...k02,...patch}));
 assert.equal(adaptK02({...k02,TIME_PRECISION:'MINUTE',NORMALIZED_BIRTH_TIME:'12:00'}).time_consistency_status,'ARITHMETICALLY_CONSISTENT');
});
