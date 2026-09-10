// SPDX-License-Identifier: AGPL-3.0-only
import {BODIES} from './calculation.js';
const auditKeys=`KNOWLEDGE_VERSION_VALID LICENSE_GATE_VALID DEPLOYMENT_GATE_VALID RUNTIME_ENGINE_ID_VALID RUNTIME_VERSION_VALID EPHEMERIS_DATA_ID_VALID SWIEPH_REQUESTED SWIEPH_RETURNED NO_MOSEPH_FALLBACK NO_JPL_MODE_MISMATCH CALC_FLAGS_VALID NO_TRUEPOS NO_TOPOCENTRIC NO_SIDEREAL NO_J2000 SPEED_FLAG_VALID K02_TIME_CONTRACT_VALID K02_GEO_CONTRACT_VALID TZDB_VERSION_RECORDED UTC_VALID JD_UT_VALID TEN_PLANETS_VALID LONGITUDE_RANGE_VALID SIGN_MAPPING_VALID MOON_TIME_RANGE_VALID RETROGRADE_VALID PLACIDUS_REQUESTED HOUSE_CODE_P_VALID HOUSE_RETURN_CODE_VALID NO_PORPHYRY_AS_PLACIDUS ASC_VALID MC_VALID HOUSE_CUSPS_VALID PLANET_HOUSES_VALID ASPECT_45_PAIRS_VALID ORB_TABLE_VALID BOUNDARY_VALID NO_TEMPLATE_AS_REAL_DATA NO_GENERAL_KNOWLEDGE_EPHEMERIS NO_DATE_TABLE_SUBSTITUTION NO_MOON_GUESS NO_ASC_GUESS NO_HOUSE_GUESS NO_CROSS_SYSTEM_CONTAMINATION LOCAL_STOP_VALID REGRESSION_SUITE_VALID REPRODUCIBILITY_VALID`.split(' ');
export function withK08Result(result) {
  const source=result.input_echo?.k02??result.input_echo??{};
  const range=Boolean(result.range_contract),positions=result.positions??[],h=result.houses??{};
  const planets=Object.fromEntries(BODIES.map(body=>{
    const p=positions.find(p=>p.body===body)??{};
    const usable=p.status==='VALID'&&!range;
    return [body,{BODY:body,JULIAN_DAY_UT:usable?result.jd_ut:null,LONGITUDE:usable?p.longitude:null,LATITUDE:usable?p.latitude:null,
      SIGN:usable?p.sign??null:null,SIGN_DEGREE:usable?p.sign_degree??null:null,LONGITUDE_SPEED:usable?p.longitude_speed:null,
      MOTION:usable?p.motion??null:null,SIGN_BOUNDARY_SENSITIVE:usable?p.sign_boundary_sensitive??null:null,
      HOUSE:usable?p.house??null:null,HOUSE_CUSP_SENSITIVE:usable?p.house_cusp_sensitive??null:null,
      REQUEST_FLAGS:result.calc_flags??null,RETURN_FLAGS:p.return_flag??null,EPHEMERIS_MODE_RETURNED:usable?result.ephemeris_mode:null,
      ENGINE_VERSION:result.runtime_version??null,EPHEMERIS_DATA_ID:result.ephemeris_data_version??null,
      STATUS:p.status??'UNAVAILABLE',LIMITATION:[...(p.error?[p.error]:[]),...(p.house_limitation?[p.house_limitation]:[]),...(range?['RANGE_EVIDENCE_ONLY']:[]),'RUNTIME_NOT_APPROVED']}];
  }));
  const houses={HOUSE_SYSTEM_REQUESTED:'PLACIDUS',HOUSE_CODE:'P',HOUSE_SYSTEM_ACTUAL:h.system??null,RETURN_CODE:h.return_flag??null,
    ASC:h.asc??null,MC:h.mc??null,ASC_STATUS:h.status==='VALID'?'VALID':h.asc_status??'UNAVAILABLE',MC_STATUS:h.status==='VALID'?'VALID':h.mc_status??'UNAVAILABLE',FALLBACK_DETECTED:h.fallback_detected??(h.status==='VALID'?false:null),STATUS:h.status??'UNAVAILABLE',WARNINGS:h.limitation?[h.limitation]:[]};
  for(let i=0;i<12;i++)houses['CUSP_'+(i+1)]=h.status==='VALID'?h.cusps?.[i]??null:null;
  const aspects=(result.aspects?.pairs??[]).map(p=>({BODY_A:p.body_a,BODY_B:p.body_b,ANGLE_DISTANCE:p.angle_distance??null,ASPECT:p.aspect??null,
    EXACT_ANGLE:p.exact_angle??null,DELTA:p.delta??null,ORB:p.orb??null,EXACTNESS_RATIO:p.exactness_ratio??null,STRENGTH:p.strength??null,
    TIME_STABILITY:range?p.status:'SINGLE_INSTANT_ONLY',STATUS:p.status}));
  const audit=Object.fromEntries(auditKeys.map(k=>[k,null]));
  Object.assign(audit,{LICENSE_GATE_VALID:false,DEPLOYMENT_GATE_VALID:false,REGRESSION_SUITE_VALID:null,
    RUNTIME_VERSION_VALID:result.runtime_version?result.runtime_version==='2.10.03':null,
    TZDB_VERSION_RECORDED:typeof source.TZDB_VERSION==='string'&&Boolean(source.TZDB_VERSION),
    JD_UT_VALID:Number.isFinite(result.jd_ut)?true:null,
    TEN_PLANETS_VALID:range?null:positions.length===10&&positions.every(p=>p.status==='VALID'),
    HOUSE_RETURN_CODE_VALID:h.return_flag==null?null:h.return_flag===0,
    ASC_VALID:h.status==='VALID'?true:null,MC_VALID:h.status==='VALID'?true:null,
    HOUSE_CUSPS_VALID:h.status==='VALID'?true:h.status?false:null,
    PLANET_HOUSES_VALID:range?null:positions.length===10&&positions.every(p=>p.house_status==='VALID'),
    ASPECT_45_PAIRS_VALID:aspects.length===45?true:null,OVERALL:'FAIL'});
  const available={PLANETS:positions.filter(p=>p.status==='VALID').map(p=>p.body),
    ASC:h.status==='VALID'?'CALCULATED':h.asc_status??'UNAVAILABLE',MC:h.status==='VALID'?'CALCULATED':h.mc_status??'UNAVAILABLE',
    HOUSE_CUSPS:h.status==='VALID',PLANET_HOUSES:positions.filter(p=>p.house_status==='VALID').map(p=>p.body),
    ASPECT_PAIRS:aspects.filter(p=>p.STATUS!=='UNAVAILABLE').length,RANGE_EVIDENCE:range,USAGE_STATUS:'DEVELOPMENT_ONLY'};
  const natal={VERSION:'K08_v2.2_PRODUCTION',RUNTIME:{ENGINE:result.runtime_version?'SWISS_EPHEMERIS':null,ENGINE_VERSION:result.runtime_version??null,
      LICENSE_STATUS:'UNVERIFIED',EPHEMERIS_MODE:result.ephemeris_mode??null,EPHEMERIS_DATA_ID:result.ephemeris_data_version??null,RUNTIME_STATUS:'RUNTIME_NOT_APPROVED'},
    TIME:{LOCAL_DATETIME:source.LOCAL_CIVIL_DATETIME??null,TIME_PRECISION:source.TIME_PRECISION??null,IANA_ZONE:source.TIMEZONE_ID??null,TZDB_VERSION:source.TZDB_VERSION??null,
      UTC_OFFSET:source.UTC_OFFSET_EFFECTIVE??null,UTC_DATETIME:source.UTC_DATETIME??null,K02_STATUS:source.K02_AUDIT_STATUS??null},
    GEO:{PLACE:source.PLACE_NORMALIZED??null,LATITUDE:source.LATITUDE??null,LONGITUDE:source.LONGITUDE??null,GEO_PRECISION:source.GEO_PRECISION??null,K02_STATUS:source.GEO_STATUS??null},
    PLANETS:planets,ANGLES:{ASC:houses.ASC,MC:houses.MC,ASC_STATUS:houses.ASC_STATUS,MC_STATUS:houses.MC_STATUS},HOUSES:{SYSTEM:h.system??null,STATUS:houses.STATUS,CUSPS:h.status==='VALID'?h.cusps:null,
      PLANET_HOUSES:Object.fromEntries(BODIES.map(b=>[b,planets[b].HOUSE]))},ASPECTS:aspects,
    BOUNDARY_FLAGS:Object.fromEntries(BODIES.map(b=>[b,{SIGN:planets[b].SIGN_BOUNDARY_SENSITIVE,HOUSE:planets[b].HOUSE_CUSP_SENSITIVE}])),
    RUNTIME_WARNINGS:houses.WARNINGS,LIMITATIONS:[...(result.limitations??[]),'RUNTIME_NOT_APPROVED','K19_FINAL_AUDIT_PENDING'],OVERALL_STATUS:'RUNTIME_NOT_APPROVED',FACT_AUDIT:audit};
  return {...result,K08_STATUS:'RUNTIME_NOT_APPROVED',K09_USAGE_STATUS:'LOCAL_BLOCK',K08_NATAL_RESULT:natal,K08_HOUSE_RESULT:houses,K08_AUDIT:audit,AVAILABLE_COMPONENTS:available,
    K08_PROVENANCE:{SCHEMA:'K08_RESULT_ADAPTER_v1',INPUT_CONTRACT:result.input_contract??'K08_ENGINE_ADAPTER_v0.2',RANGE_CONTRACT:result.range_contract??null,
      SOURCE_URL:'https://github.com/freeunderworld11/uranai-ai-k08-runtime',TIMEZONE_AUDIT:result.timezone_audit??null,APPROVAL_STATUS:'PENDING'}};
}
