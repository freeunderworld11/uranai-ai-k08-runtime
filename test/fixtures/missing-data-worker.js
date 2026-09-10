// SPDX-License-Identifier: AGPL-3.0-only
import { createSwissEph } from '../../.generated/dist/instance.js';
import {calculateWith} from '../../src/calculation.js';
export default {async fetch(){
 const swe=await createSwissEph();
 try {return Response.json(calculateWith(swe,{jd_ut:2451545,latitude:35,longitude:139}));}
 catch(error){return Response.json({error:error.code},{status:error.status??503});}
 finally{swe.dispose();}
}};
