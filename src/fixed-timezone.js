// SPDX-License-Identifier: AGPL-3.0-only
import moment from 'moment-timezone';
export const TZDB_VERSION='2026c';
export const TZDB_HASH='43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81';
function zone(name) {
  if(moment.tz.dataVersion!==TZDB_VERSION)throw new Error('Pinned timezone data version mismatch');
  return moment.tz.zone(name);
}
export function localAtUTC(name,utc) {
  const z=zone(name);if(!z)return null;
  const t=Date.parse(utc);
  return new Date(t-Math.round(z.utcOffset(t)*60000)).toISOString().slice(0,19);
}
export function utcCandidates(name,local) {
  const z=zone(name);if(!z)return null;
  const wall=Date.parse(local+'Z'),found=[];
  for(let i=0;i<z.untils.length;i++) {
    const t=wall+Math.round(z.offsets[i]*60000);
    if(t>=(i?z.untils[i-1]:-Infinity)&&t<z.untils[i])found.push(t);
  }
  return [...new Set(found)].sort((a,b)=>a-b);
}
