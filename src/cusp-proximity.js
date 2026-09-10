// SPDX-License-Identifier: AGPL-3.0-only
export function cuspProximity(longitude,cusps) {
  const unavailable={house_cusp_sensitive:null,house_cusp_status:'UNAVAILABLE'};
  if(!Number.isFinite(longitude)||!Array.isArray(cusps)||cusps.length!==12||!cusps.every(Number.isFinite))return unavailable;
  const norm=x=>x>=0&&x<360?x:((x%360)+360)%360;
  const distances=cusps.map(c=>{const d=Math.abs(norm(longitude)-norm(c));return Math.min(d,360-d);});
  const minimum=Math.min(...distances);
  return {house_cusp_sensitive:minimum<=1,house_cusp_status:'VALID',house_cusp_distance_degrees:minimum,
    house_nearest_cusps:distances.flatMap((d,i)=>d===minimum?[i+1]:[]),
    house_nearby_cusps:distances.flatMap((d,i)=>d<=1?[i+1]:[]),
    house_cusp_distance_method:'MINIMUM_ECLIPTIC_LONGITUDE_SEPARATION'};
}
