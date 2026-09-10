// SPDX-License-Identifier: AGPL-3.0-only
import { createSwissEph } from '../.generated/dist/instance.js';
import planets from '../.generated/ephe/sepl_18.se1';
import moon from '../.generated/ephe/semo_18.se1';
import asteroids from '../.generated/ephe/seas_18.se1';
import { calculateWith, CalculationError } from './calculation.js';
export async function calculate(input) {
  let swe;
  try {
    swe = await createSwissEph();
    swe.mountEphemeris({'sepl_18.se1':planets,'semo_18.se1':moon,'seas_18.se1':asteroids});
    return calculateWith(swe,input);
  } catch (error) {
    if (error instanceof CalculationError) throw error;
    throw new CalculationError('RUNTIME_UNAVAILABLE',503);
  } finally { swe?.dispose(); }
}
