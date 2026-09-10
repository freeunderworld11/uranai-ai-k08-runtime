import test from 'node:test';
import assert from 'node:assert/strict';
import {solarBoundaryWith,validateSolarInput} from '../src/solar-boundary.js';
const input={TARGET_SOLAR_LONGITUDE_DEG:0.5,SEARCH_START_UTC:'2000-01-01T00:00:00Z',SEARCH_END_UTC:'2000-01-02T00:00:00Z',TIME_SCALE_REQUIREMENT:'UT',K02_VERSION:'K02_v2.4_PRODUCTION'};
const engine={version:'2.10.03',julianDay:(y,m,d,h)=>d-1+h/24,calc:jd=>({longitude:jd,longitudeSpeed:1,ephemeris:'swiss',returnFlags:258})};
test('independent service finds known target without natal inputs',()=>{
 const r=solarBoundaryWith(engine,input);assert.equal(r.BOUNDARY_UTC_DATETIME,'2000-01-01T12:00:00.000Z');assert.ok(r.BRACKET_WIDTH_SECONDS<=0.1);assert.deepEqual(r.input_echo,input);
 assert.equal(solarBoundaryWith(engine,{...input,TARGET_SOLAR_LONGITUDE_DEG:0}).BOUNDARY_UTC_DATETIME,'2000-01-01T00:00:00.000Z');
 assert.equal(solarBoundaryWith(engine,{...input,TARGET_SOLAR_LONGITUDE_DEG:1}).BOUNDARY_UTC_DATETIME,'2000-01-02T00:00:00.000Z');
});
test('no crossing or rejected ephemeris yields no invented time',()=>{
 for(const r of [solarBoundaryWith(engine,{...input,TARGET_SOLAR_LONGITUDE_DEG:10}),solarBoundaryWith({...engine,calc:()=>({longitude:0,longitudeSpeed:1,ephemeris:'moshier',returnFlags:260})},input)]){assert.equal(r.CALCULATION_STATUS,'UNRESOLVED');assert.equal(r.BOUNDARY_UTC_DATETIME,undefined);}
 assert.throws(()=>solarBoundaryWith({...engine,calc:()=>({})},input),{code:'GLOBAL_RUNTIME_FAIL'});
});
test('schema, time scale and maximum interval are enforced',()=>{
 for(const patch of [{TARGET_SOLAR_LONGITUDE_DEG:360},{SEARCH_START_UTC:'2000-02-30T00:00:00Z'},{SEARCH_END_UTC:'2000-03-01T00:00:00Z'},{TIME_SCALE_REQUIREMENT:'TT'},{K02_VERSION:'other'},{extra:1}])assert.throws(()=>validateSolarInput({...input,...patch}));
});
