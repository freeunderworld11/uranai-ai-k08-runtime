// SPDX-License-Identifier: AGPL-3.0-only
// Compare angle fields only. Never adopt the check call's alternative cusps.
export function checkPolarAngles(swe,input,original) {
  const out={asc_status:'UNAVAILABLE',mc_status:'UNAVAILABLE',angle_validation_method:'SAME_ENGINE_P_E_COMPARISON',angle_validation_tolerance_degrees:1e-7};
  if(!original || original.returnFlags>=0 || !original.substituted || Math.abs(input.latitude)>=90)return out;
  const check=swe.houses(input.jd_ut,input.latitude,input.longitude,'E');
  if(!check || !Number.isInteger(check.returnFlags) || check.requestedSystem!=='E')throw new Error('Invalid angle validation metadata');
  if(check.returnFlags!==0 || check.substituted || check.warning)return out;
  const angle=x=>Number.isFinite(x)&&x>=0&&x<360;
  for(const [key,field] of [['asc','ascendant'],['mc','midheaven']]) {
    const a=original[field],b=check[field];
    if(!angle(a)||!angle(b))continue;
    const d=Math.abs(a-b);
    if(Math.min(d,360-d)<=1e-7){out[key]=a;out[key+'_status']='CONDITIONAL';}
  }
  return out;
}
