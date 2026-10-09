import {readFile,writeFile} from 'node:fs/promises';
import {WEATHER_CONFIG} from '../weather/config.mjs';
// Run only from the managed repository after public validation.
// This stamps the first verified launch; subsequent deployments preserve the same clock.
if(WEATHER_CONFIG.launchAt)throw Error('Launch already recorded; preserve the original timestamp. Use an explicit reviewed config edit for an override.');
for(const route of ['/weather/','/weather/broadcast/fixed/','/weather/broadcast/rotating/']){
 const response=await fetch('https://rctv19.com'+route,{signal:AbortSignal.timeout(20000)});const html=await response.text();if(!response.ok||!html.includes('/assets/weather/client.mjs'))throw Error('Public weather route not verified: '+route);
}
const api=await fetch('https://rctv19.com/api/weather',{signal:AbortSignal.timeout(30000)});const data=await api.json();if(!api.ok||data.sources?.radar?.state!=='current'||data.sources?.alerts?.state!=='current'||data.sources?.storm?.state!=='current'||data.sources?.storm?.data?.storm?.id!==WEATHER_CONFIG.stormId)throw Error('Official storm, radar and alert adapter must be current and verified before recording launch.');
const launch=new Date(),expires=new Date(+launch+48*3600000);const path='weather/config.mjs',text=await readFile(path,'utf8');if(!text.includes('launchAt: null'))throw Error('Unrecognized launch configuration');await writeFile(path,text.replace('launchAt: null',`launchAt: '${launch.toISOString()}'`));
console.log(JSON.stringify({launchAt:launch.toISOString(),expiresAt:expires.toISOString(),expiresCentral:new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',dateStyle:'full',timeStyle:'long'}).format(expires),next:'Publish this exact config through the existing Git integration, then verify /api/weather expiresAt matches.'},null,2));
