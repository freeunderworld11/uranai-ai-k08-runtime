// SPDX-License-Identifier: AGPL-3.0-only
import {CalculationError} from './calculation.js';
import {cuspProximity} from './cusp-proximity.js';
export function withPlanetHouses(swe,result,latitude) {
  let eps;
  if(result.houses.status==='VALID') {
    try {eps=swe.obliquity(result.jd_ut).trueObliquity;}
    catch(e){if(e?.name!=='SwissEphError')throw new CalculationError('GLOBAL_RUNTIME_FAIL',503);}
  }
  const positions=result.positions.map(p=>{
    const unavailable=reason=>({...p,house:null,house_status:'UNAVAILABLE',house_limitation:reason,house_cusp_sensitive:null,house_cusp_status:'UNAVAILABLE'});
    if(p.status!=='VALID')return unavailable('DEPENDENT_PLANET_UNAVAILABLE');
    if(result.houses.status!=='VALID')return unavailable('PLACIDUS_UNAVAILABLE');
    if(!Number.isFinite(eps)||!Number.isFinite(result.houses.armc))return unavailable('HOUSE_INPUT_UNAVAILABLE');
    let h;
    try {h=swe.housePosition(result.houses.armc,latitude,eps,p.longitude,p.latitude);}
    catch(e){if(e?.name!=='SwissEphError')throw new CalculationError('GLOBAL_RUNTIME_FAIL',503);return unavailable('HOUSE_POSITION_FAILED');}
    if(!h||h.warning||!Number.isFinite(h.position)||h.position<1||h.position>=13)return unavailable('HOUSE_POSITION_REJECTED');
    return {...p,house:Math.floor(h.position),house_position:h.position,house_status:'VALID',house_method:'swe_house_pos',...cuspProximity(p.longitude,result.houses.cusps)};
  });
  return {...result,positions,result_status:result.result_status==='COMPLETE'&&positions.some(p=>p.house_status!=='VALID')?'PARTIAL':result.result_status};
}
