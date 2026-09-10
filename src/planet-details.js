// SPDX-License-Identifier: AGPL-3.0-only
const signs=['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES'];
const names=['牡羊座','牡牛座','双子座','蟹座','獅子座','乙女座','天秤座','蠍座','射手座','山羊座','水瓶座','魚座'];
export function withPlanetDetails(result) {
  return {...result,positions:result.positions.map(p=>{
    if(p.status!=='VALID')return {...p};
    const raw=p.longitude;
    // Do not perturb already normalized values immediately below a boundary.
    const longitude=raw>=0&&raw<360?raw:((raw%360)+360)%360;
    const sign_index=Math.floor(longitude/30);
    const sign_degree=longitude-sign_index*30;
    const sign_boundary_distance=Math.min(sign_degree,30-sign_degree);
    return {...p,longitude,...(raw!==longitude?{raw_longitude:raw}:{}),sign_index,sign:signs[sign_index],sign_name:names[sign_index],sign_degree,
      sign_boundary_distance,sign_boundary_sensitive:sign_boundary_distance<=0.1,
      motion:p.longitude_speed<0?'RETROGRADE':p.longitude_speed>0?'DIRECT':'ZERO_SPEED',
      station_sensitive:null,station_status:'NUMERICAL_PRECISION_NOT_ESTABLISHED'};
  })};
}
