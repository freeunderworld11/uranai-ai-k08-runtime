import {solarBoundaryWith,validateSolarInput} from './solar-boundary.js';
// SPDX-License-Identifier: AGPL-3.0-only
import { createSwissEph } from '../.generated/dist/instance.js';
import planets from '../.generated/ephe/sepl_18.se1';
import moon from '../.generated/ephe/semo_18.se1';
import asteroids from '../.generated/ephe/seas_18.se1';
import { calculateWith, CalculationError } from './calculation.js';
import {adaptK02} from './k02-adapter.js';
import {withAspects} from './aspects.js';
import {withPlanetDetails} from './planet-details.js';
import {withPlanetHouses} from './planet-houses.js';
import {adaptRange,calculateRangeWith} from './time-range.js';
export async function calculateK02Range(input) {
  const gate=adaptRange(input);
  if(gate.result_status==='UNAVAILABLE')return gate;
  let swe;
  try {
    swe=await createSwissEph();
    swe.mountEphemeris({'sepl_18.se1':planets,'semo_18.se1':moon,'seas_18.se1':asteroids});
    return calculateRangeWith(swe,gate);
  } catch(error) {
    if(error instanceof CalculationError)throw error;
    throw new CalculationError('RUNTIME_UNAVAILABLE',503);
  } finally {swe?.dispose();}
}
export async function calculateK02(source) {
  const gate=adaptK02(source);
  if(!gate.utc_parts)return {result_status:'UNAVAILABLE',input_contract:'K02_TO_K08_ASTRO_TIME_GEO_v1',...gate};
  let swe;
  try {
    swe=await createSwissEph();
    swe.mountEphemeris({'sepl_18.se1':planets,'semo_18.se1':moon,'seas_18.se1':asteroids});
    const p=gate.utc_parts;
    const jd=swe.julianDay(p.year,p.month,p.day,p.hour);
    const result=calculateWith(swe,{jd_ut:jd,latitude:source.LATITUDE,longitude:source.LONGITUDE},{skipHouses:gate.geo_status==='LOCAL_BLOCK'});
    const {utc_parts,...audit}=gate;
    const enriched=withPlanetHouses(swe,result,source.LATITUDE);
    return {...withAspects(withPlanetDetails(enriched)),input_contract:'K02_TO_K08_ASTRO_TIME_GEO_v1',...audit,derived_runtime_value:{JULIAN_DAY_UT:jd},result_status:gate.time_status==='CONDITIONAL'&&enriched.result_status==='COMPLETE'?'PARTIAL':enriched.result_status};
  } catch(error) {
    if(error instanceof CalculationError)throw error;
    throw new CalculationError('RUNTIME_UNAVAILABLE',503);
  } finally {swe?.dispose();}
}
export async function calculate(input) {
  let swe;
  try {
    swe = await createSwissEph();
    swe.mountEphemeris({'sepl_18.se1':planets,'semo_18.se1':moon,'seas_18.se1':asteroids});
    return withAspects(withPlanetDetails(withPlanetHouses(swe,calculateWith(swe,input),input.latitude)));
  } catch (error) {
    if (error instanceof CalculationError) throw error;
    throw new CalculationError('RUNTIME_UNAVAILABLE',503);
  } finally { swe?.dispose(); }
}

export async function calculateSolarBoundary(input) {
 validateSolarInput(input);
 let swe;
 try {swe=await createSwissEph();swe.mountEphemeris({'sepl_18.se1':planets,'semo_18.se1':moon,'seas_18.se1':asteroids});return solarBoundaryWith(swe,input);}
 catch(e){if(e instanceof CalculationError)throw e;throw new CalculationError('RUNTIME_UNAVAILABLE',503);}
 finally{swe?.dispose();}
}
