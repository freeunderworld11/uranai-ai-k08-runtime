import test from 'node:test';
import assert from 'node:assert/strict';
import {timezoneAudit} from '../src/timezone-audit.js';
test('missing runtime evidence is not guessed from K02 or ICU',()=>{
 const r=timezoneAudit({TZDB_VERSION:'2025b'},{tz:'',icu:'75'});
 assert.equal(r.version_comparison,'RUNTIME_VERSION_UNAVAILABLE');assert.equal(r.runtime_reported_version,null);assert.equal(r.production_eligible,false);
});
test('reported matches and mismatches remain distinct from certification',()=>{
 for(const [tz,status] of [['2025b','REPORTED_VERSIONS_MATCH'],['2024a','REPORTED_VERSIONS_MISMATCH']]){
  const r=timezoneAudit({TZDB_VERSION:'2025b'},{tz});assert.equal(r.version_comparison,status);assert.equal(r.timezone_certification_status,'UNVERIFIED');assert.equal(r.runtime_data_source_verified,false);
 }
 assert.equal(timezoneAudit(null,{}).version_comparison,'K02_VERSION_MISSING');
});
