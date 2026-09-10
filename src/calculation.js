// SPDX-License-Identifier: AGPL-3.0-only
export class CalculationError extends Error {
  constructor(code, status = 422) { super(code); this.code = code; this.status = status; }
}
export const BODIES = Object.freeze(['SUN','MOON','MERCURY','VENUS','MARS','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO']);
export const FLAGS = 258; // SEFLG_SWIEPH (2) | SEFLG_SPEED (256)
export function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CalculationError('INVALID_INPUT',400);
  if (Object.keys(input).some(k => !['jd_ut','latitude','longitude'].includes(k))) throw new CalculationError('UNKNOWN_FIELD',400);
  const {jd_ut,latitude,longitude} = input;
  if (![jd_ut,latitude,longitude].every(x=>typeof x==='number' && Number.isFinite(x))) throw new CalculationError('INVALID_INPUT',400);
  // Deliberately narrower than the bundled data range; expand only with evidence.
  if (jd_ut < 2415020.5 || jd_ut >= 2488069.5) throw new CalculationError('DATE_OUT_OF_RANGE');
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new CalculationError('INVALID_COORDINATES',400);
  return {jd_ut,latitude,longitude};
}
function finite(values) { if (!values.every(Number.isFinite)) throw new CalculationError('INVALID_ENGINE_OUTPUT',503); }
function globalFailure() { throw new CalculationError('GLOBAL_RUNTIME_FAIL',503); }
function engineError(error, fn) { return error?.name === 'SwissEphError' && error.fn === fn; }
export function calculateWith(swe, input, {skipHouses=false} = {}) {
  if(skipHouses) {
    // Validate the date independently; coordinates are not consumed on this path.
    validateInput({jd_ut:input.jd_ut,latitude:0,longitude:0});
  } else input = validateInput(input);
  if (swe.version !== '2.10.03') throw new CalculationError('RUNTIME_VERSION_MISMATCH',503);
  const {jd_ut,latitude,longitude} = input;
  const positions = BODIES.map((body,id)=>{
    let p;
    try { p = swe.calc(jd_ut,id,{ephemeris:'swiss'}); }
    catch(error) {
      if (!engineError(error,'swe_calc_ut')) globalFailure();
      return {body,status:'UNAVAILABLE',error:'PLANET_CALCULATION_FAILED',return_flag:null};
    }
    if (!p || !Number.isInteger(p.returnFlags) || typeof p.ephemeris !== 'string') globalFailure();
    const rejected = error => ({body,status:'UNAVAILABLE',error,return_flag:p.returnFlags});
    if (p.ephemeris !== 'swiss' || p.returnFlags !== FLAGS) return rejected('EPHEMERIS_FALLBACK_REJECTED');
    if (p.warning) return rejected('PLANET_WARNING_REJECTED');
    if (![p.longitude,p.latitude,p.distance,p.longitudeSpeed,p.latitudeSpeed,p.distanceSpeed].every(Number.isFinite)) return rejected('INVALID_PLANET_OUTPUT');
    return {body,status:'VALID',error:null,longitude:p.longitude,latitude:p.latitude,distance_au:p.distance,longitude_speed:p.longitudeSpeed,latitude_speed:p.latitudeSpeed,distance_speed_au:p.distanceSpeed,return_flag:p.returnFlags};
  });
  let h;
  try { if(!skipHouses) h = swe.houses(jd_ut,latitude,longitude,'P'); }
  catch(error) { if (!engineError(error,'swe_houses_ex2')) globalFailure(); }
  if (h && (!Number.isInteger(h.returnFlags) || h.requestedSystem !== 'P')) globalFailure();
  const validHouses = h && h.returnFlags === 0 && !h.substituted && !h.warning && Array.isArray(h.cusps) && h.cusps.length === 12 && [...h.cusps,h.ascendant,h.midheaven].every(Number.isFinite);
  const houses = skipHouses ? {system:null,system_requested:'PLACIDUS',status:'UNAVAILABLE_GEO',asc_status:'UNAVAILABLE',mc_status:'UNAVAILABLE'} : validHouses
    ? {system:'PLACIDUS',status:'VALID',armc:h.armc,asc:h.ascendant,mc:h.midheaven,cusps:h.cusps,return_flag:h.returnFlags}
    : {system:null,system_requested:'PLACIDUS',status:'UNAVAILABLE_PLACIDUS',return_flag:h?.returnFlags??null,fallback_detected:h?.substituted??false,asc_status:'UNAVAILABLE',mc_status:'UNAVAILABLE',limitation:'Independent ASC/MC validation after house failure is not implemented.'};
  const deltaT = swe.deltaT(jd_ut,'swiss') * 86400;
  finite([deltaT]);
  const validCount = positions.filter(p=>p.status==='VALID').length;
  const resultStatus = validCount===10 && validHouses ? 'COMPLETE' : validCount>0 || validHouses ? 'PARTIAL' : 'UNAVAILABLE';
  return {result_status:resultStatus,valid_planet_count:validCount,jd_ut,delta_t_seconds:deltaT,ephemeris_mode:validCount ? 'SWISS_EPHEMERIS' : null,runtime_version:swe.version,ephemeris_data_version:'@kuntay/swisseph-data@0.2.2',calc_flags:FLAGS,coordinate_system:'GEOCENTRIC_TROPICAL_ECLIPTIC_OF_DATE',positions,houses};
}
