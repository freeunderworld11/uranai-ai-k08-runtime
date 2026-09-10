// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateWith,validateInput} from '../src/calculation.js';
const input={jd_ut:2451545,latitude:35,longitude:139};
test('Moshier, incorrect flags, warnings and version mismatches fail closed',()=>{
 for(const p of [{ephemeris:'moshier',returnFlags:260},{ephemeris:'swiss',returnFlags:2},{ephemeris:'swiss',returnFlags:258,warning:'missing file'}]){
  assert.throws(()=>calculateWith({version:'2.10.03',calc:()=>p},input),{code:'EPHEMERIS_FALLBACK_REJECTED'});
 }
 assert.throws(()=>calculateWith({version:'2.10.04'},input),{code:'RUNTIME_VERSION_MISMATCH'});
});
test('nonfinite input is rejected',()=>{
 for(const jd_ut of [NaN,Infinity,-Infinity])assert.throws(()=>validateInput({...input,jd_ut}),{code:'INVALID_INPUT'});
});
