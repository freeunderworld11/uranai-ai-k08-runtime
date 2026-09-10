import test from 'node:test';
import assert from 'node:assert/strict';
import {utcCandidates,localAtUTC} from '../src/fixed-timezone.js';
import {adaptK02} from '../src/k02-adapter.js';
import {k02} from './fixtures/k02.js';
test('fixed data rejects gaps and retains both repeated-hour candidates',()=>{
 assert.deepEqual(utcCandidates('America/New_York','2024-03-10T02:30:00'),[]);
 assert.deepEqual(utcCandidates('America/New_York','2024-11-03T01:30:00').map(t=>new Date(t).toISOString()),['2024-11-03T05:30:00.000Z','2024-11-03T06:30:00.000Z']);
 assert.deepEqual(utcCandidates('Pacific/Apia','2011-12-30T12:00:00'),[]);
 assert.equal(localAtUTC('Europe/Paris','1900-01-01T11:50:39Z'),'1900-01-01T12:00:00');
 assert.equal(localAtUTC('Invalid/Zone','2000-01-01T00:00:00Z'),null);
});
test('declared normal status cannot bypass fixed rules or pinned version',()=>{
 for(const [patch,reason] of [[{TZDB_VERSION:'2025b'},'K02_TZDB_VERSION_MISMATCH'],[{TIMEZONE_ID:'Asia/Tokyo'},'K02_TIMEZONE_RULE_MISMATCH']])assert.deepEqual(adaptK02({...k02,...patch}).limitations,[reason]);
 const repeated={...k02,NORMALIZED_BIRTH_DATE:'2024-11-03',NORMALIZED_BIRTH_TIME:'01:30:00',LOCAL_CIVIL_DATETIME:'2024-11-03T01:30:00',TIMEZONE_ID:'America/New_York',UTC_OFFSET_EFFECTIVE:'-04:00',UTC_DATETIME:'2024-11-03T05:30:00Z'};
 assert.deepEqual(adaptK02(repeated).limitations,['K02_LOCAL_TIME_AMBIGUOUS']);
});
