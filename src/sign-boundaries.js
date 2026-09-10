// SPDX-License-Identifier: AGPL-3.0-only
export const signIndex = longitude => Math.floor((((longitude % 360) + 360) % 360) / 30);
const valid = p => p?.status === 'VALID';

// Locate observed sign changes, not a proof that every root has been found.
// Times are milliseconds relative to the explicit UTC range start.
export function refineSignBoundaries(times, sample, body, toUTC) {
  const brackets = [];
  let unresolved = 0;
  function transition(left, right) {
    let a = sample(left)?.positions[body], b = sample(right)?.positions[body];
    if (!valid(a) || !valid(b)) { unresolved++; return; }
    if (signIndex(a.longitude) === signIndex(b.longitude)) return;
    const from = signIndex(a.longitude), to = signIndex(b.longitude);
    if ((to - from + 12) % 12 !== 1 && (from - to + 12) % 12 !== 1) { unresolved++; return; }
    while (right - left > 1000) {
      const mid = (left + right) / 2;
      const p = sample(mid)?.positions[body];
      if (!valid(p)) { unresolved++; return; }
      const sign = signIndex(p.longitude);
      if (sign === from) { left = mid; a = p; }
      else if (sign === to) { right = mid; b = p; }
      else { unresolved++; return; }
    }
    const direct = (to - from + 12) % 12 === 1;
    brackets.push({start_utc:toUTC(left),end_utc:toUTC(right),
      width_seconds:(right-left)/1000,from_sign_index:from,to_sign_index:to,
      boundary_longitude:30*(direct?to:from),direction:direct?'DIRECT':'RETROGRADE',
      start_longitude:a.longitude,end_longitude:b.longitude,status:'BRACKETED'});
  }
  for (let i = 1; i < times.length; i++) {
    const left = times[i-1], right = times[i];
    const a = sample(left)?.positions[body], b = sample(right)?.positions[body];
    if (!valid(a) || !valid(b)) { unresolved++; continue; }
    // A detected speed reversal can hide two crossings inside one grid interval.
    if (a.longitude_speed * b.longitude_speed < 0) {
      let lo = left, hi = right, failed = false;
      while (hi-lo > 1000) {
        const mid = (lo+hi)/2, p = sample(mid)?.positions[body];
        if (!valid(p)) { failed = true; break; }
        if (p.longitude_speed === 0) { lo = hi = mid; break; }
        if (Math.sign(p.longitude_speed) === Math.sign(a.longitude_speed)) lo = mid;
        else hi = mid;
      }
      if (failed) { unresolved++; continue; }
      const points = [...new Set([left,lo,(lo+hi)/2,hi,right])].sort((x,y)=>x-y);
      for(let j=1;j<points.length;j++) transition(points[j-1],points[j]);
    } else transition(left,right);
  }
  return {transition_brackets:brackets,unresolved_interval_count:unresolved,
    boundary_search_status:unresolved?'INCOMPLETE':'OBSERVED_TRANSITIONS_REFINED',
    all_transitions_certified:false};
}
