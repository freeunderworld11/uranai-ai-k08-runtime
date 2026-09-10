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
export function calculateWith(swe, input) {
  if (swe.version !== '2.10.03') throw new CalculationError('RUNTIME_VERSION_MISMATCH',503);
  const {jd_ut,latitude,longitude} = input;
  const positions = BODIES.map((body,id)=>{
    const p = swe.calc(jd_ut,id,{ephemeris:'swiss'});
    if (p.ephemeris !== 'swiss' || p.returnFlags !== FLAGS || p.warning) throw new CalculationError('EPHEMERIS_FALLBACK_REJECTED');
    finite([p.longitude,p.latitude,p.distance,p.longitudeSpeed,p.latitudeSpeed,p.distanceSpeed]);
    return {body,longitude:p.longitude,latitude:p.latitude,distance_au:p.distance,longitude_speed:p.longitudeSpeed,latitude_speed:p.latitudeSpeed,distance_speed_au:p.distanceSpeed,return_flag:p.returnFlags};
  });
  const h = swe.houses(jd_ut,latitude,longitude,'P');
  if (h.substituted || h.returnFlags !== 0 || h.requestedSystem !== 'P' || h.warning) throw new CalculationError('PLACIDUS_UNAVAILABLE');
  if (h.cusps.length !== 12) throw new CalculationError('INVALID_ENGINE_OUTPUT',503);
  finite([...h.cusps,h.ascendant,h.midheaven]);
  const deltaT = swe.deltaT(jd_ut,'swiss') * 86400;
  finite([deltaT]);
  return {jd_ut,delta_t_seconds:deltaT,ephemeris_mode:'SWISS_EPHEMERIS',runtime_version:swe.version,ephemeris_data_version:'@kuntay/swisseph-data@0.2.2',calc_flags:FLAGS,coordinate_system:'GEOCENTRIC_TROPICAL_ECLIPTIC_OF_DATE',positions,houses:{system:'PLACIDUS',asc:h.ascendant,mc:h.midheaven,cusps:h.cusps,return_flag:h.returnFlags}};
}
