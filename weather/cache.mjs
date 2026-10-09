import {SOURCES,collectWeather,assembleWeather,modeAt} from './model.mjs';
import {WEATHER_CONFIG} from './config.mjs';
const inflight=new Map();
export async function weatherFromCache(cache,origin,now=new Date(),request=fetch,config=WEATHER_CONFIG){
 const snapshots=await Promise.all(SOURCES.filter(source=>modeAt(config,now)!=='regular'||!['storm','news'].includes(source.id)).map(async source=>{
 const key=new Request(new URL('/__weather_cache/v1/'+source.id,origin));let previous=null;
 try{const stored=await cache.match(key);if(stored)previous=await stored.json();}catch{}
 if(previous&&+now-Date.parse(previous.lastAttempt)<source.minutes*60000)return previous;
 const id=origin+'|'+source.id;if(inflight.has(id))return inflight.get(id);
 const job=(async()=>{const next=await collectWeather(source,previous,now,request,config);try{await cache.put(key,Response.json(next,{headers:{'Cache-Control':'public,max-age=86400'}}));}catch{next.error=next.error||'Weather cache write unavailable';}return next;})();
 inflight.set(id,job);try{return await job;}finally{inflight.delete(id);}
 }));
 return assembleWeather(snapshots,now,config);
}
