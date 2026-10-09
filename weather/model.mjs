import {WEATHER_CONFIG} from './config.mjs';
export const RADAR_URL='https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows';
export const REGIONS={coast:{name:'Mississippi coast & Gulf',bbox:[-95,25.5,-81,34.5]},mississippi:{name:'Mississippi',bbox:[-94,29,-86,36.5]}};
export const SOURCES=[
 {id:'storm',url:'https://www.nhc.noaa.gov/CurrentStorms.json',minutes:5,maxAge:360,kind:'storm'},
 {id:'alerts',url:'https://api.weather.gov/alerts/active?area=MS,LA,AL,FL',minutes:1,maxAge:3,kind:'alerts'},
 {id:'radar',url:RADAR_URL+'?service=WMS&version=1.3.0&request=GetCapabilities',minutes:5,maxAge:15,kind:'radar'},
 ...[{id:'biloxi',name:'Biloxi',point:'30.396,-88.885'},{id:'jackson',name:'Jackson',point:'32.299,-90.184'},{id:'tupelo',name:'Tupelo',point:'34.258,-88.703'},{id:'ripley',name:'Ripley',point:'34.729,-88.950'}].map(city=>({...city,url:'https://api.weather.gov/points/'+city.point,minutes:15,maxAge:120,kind:'forecast'})),
 {id:'news',url:'https://tippahnews.com/wp-json/wp/v2/posts?search=Isaias&per_page=8',minutes:10,maxAge:120,kind:'news'}
];
export function modeAt(config=WEATHER_CONFIG,now=new Date()){
 if(config.modeOverride==='regular')return 'regular';
 if(config.modeOverride==='storm')return 'storm';
 if(!config.launchAt)return 'storm';
 const launch=Date.parse(config.launchAt);return Number.isFinite(launch)&&+now<launch+48*3600000?'storm':'regular';
}
export function expiresAt(config=WEATHER_CONFIG){return config.launchAt?new Date(Date.parse(config.launchAt)+48*3600000).toISOString():null;}
export function validTime(value,now=new Date()){const time=Date.parse(value);if(!Number.isFinite(time)||time>+now+60000)throw Error('Missing or future-dated source time');return new Date(time).toISOString();}
export function nhcUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='www.nhc.noaa.gov')throw Error('Unexpected NHC product origin');return u.href;}
export function parseStorm(text,now=new Date(),config=WEATHER_CONFIG){
 const feed=JSON.parse(text);if(!Array.isArray(feed.activeStorms))throw Error('Invalid NHC feed');
 const s=feed.activeStorms.find(s=>s.id===config.stormId);
 if(!s)return {storm:null,issuedAt:now.toISOString(),inactive:true};
 if(s.name?.toLowerCase()!==config.stormName.toLowerCase()||!s.id.endsWith(String(config.stormYear)))throw Error('NHC storm identity mismatch');
 const issuedAt=validTime(s.publicAdvisory?.issuance,now);validTime(s.lastUpdate,now);
 const number=v=>{const n=Number(v);return v!==null&&v!==''&&Number.isFinite(n)?n:null;};
 return {issuedAt,inactive:false,storm:{id:s.id,name:s.name,classification:s.classification,windKt:number(s.intensity),pressureMb:number(s.pressure),latitude:s.latitude,longitude:s.longitude,movementDir:number(s.movementDir),movementKt:number(s.movementSpeed),advisoryNumber:s.publicAdvisory.advNum,issuedAt,updatedAt:s.lastUpdate,advisoryUrl:nhcUrl(s.publicAdvisory.url),graphicsUrl:nhcUrl(s.forecastGraphics.url),trackIssueAt:validTime(s.forecastGraphics.issuance,now)}};
}
export function parseRadar(text,now=new Date()){
 const dimension=text.match(/<Dimension\b[^>]*name="time"[^>]*>([\s\S]*?)<\/Dimension>/i)?.[1];
 if(!dimension)throw Error('Radar time dimension unavailable');
 const available=dimension.trim().split(',').map(v=>v.trim()).filter(v=>Number.isFinite(Date.parse(v))&&Date.parse(v)<=+now&&Date.parse(v)>+now-2*3600000).sort();
 if(available.length<2)throw Error('Radar animation unavailable');
 // Six-minute spacing, using actual available instants, rather than invented timestamps.
 const frames=[];for(const t of [...available].reverse())if(!frames.length||Date.parse(frames.at(-1))-Date.parse(t)>=5*60000)frames.push(t);
 return {issuedAt:available.at(-1),frames:frames.reverse().slice(-18),legendUrl:RADAR_URL+'?service=WMS&version=1.3.0&request=GetLegendGraphic&format=image%2Fpng&width=500&height=30&layer=conus_bref_qcd',sourceUrl:'https://radar.weather.gov/'};
}
export function parseAlerts(text,now=new Date()){
 const raw=JSON.parse(text);if(!Array.isArray(raw.features))throw Error('Invalid NWS alert feed');
 // Empty is authoritative only after a successful, structurally valid request.
 const alerts=raw.features.map(f=>({id:f.id,...f.properties})).filter(a=>a.status==='Actual'&&a.messageType!=='Cancel'&&Date.parse(a.expires)>+now&&Date.parse(a.effective||a.sent)<=+now)
 .map(a=>({id:a.id,event:a.event,headline:a.headline,area:a.areaDesc,severity:a.severity,sent:a.sent,effective:a.effective,expires:a.expires,description:a.description,instruction:a.instruction,url:typeof a['@id']==='string'?a['@id']:a.id,warning:/Warning$/.test(a.event),mississippi:/Mississippi|\bMS\b/i.test(a.areaDesc)||a.geocode?.SAME?.some(code=>code.slice(1,3)==='28')}));
 const rank=a=>/Tornado Warning|Hurricane Warning/.test(a.event)?4:/Flash Flood Warning|Storm Surge Warning/.test(a.event)?3:a.warning?2:1;
 alerts.sort((a,b)=>Number(b.mississippi)-Number(a.mississippi)||rank(b)-rank(a)||Date.parse(b.sent)-Date.parse(a.sent));
 return {issuedAt:validTime(raw.updated||now.toISOString(),now),alerts};
}
export function parseForecast(text,now=new Date()){
 const raw=JSON.parse(text),p=raw.properties;if(!Array.isArray(p?.periods)||!p.periods.length)throw Error('NWS forecast unavailable');
 const issuedAt=validTime(p.updateTime||p.updated,now);
 if(+now-Date.parse(issuedAt)>24*3600000)throw Error('NWS forecast issuance is over 24 hours old');
 return {issuedAt,periods:p.periods.filter(p=>Date.parse(p.endTime)>+now).slice(0,14).map(p=>({name:p.name,startTime:p.startTime,endTime:p.endTime,isDaytime:p.isDaytime,temperature:p.temperature,temperatureUnit:p.temperatureUnit,rainChance:p.probabilityOfPrecipitation?.value,windSpeed:p.windSpeed,windDirection:p.windDirection,shortForecast:p.shortForecast,detailedForecast:p.detailedForecast}))};
}
export function stripHtml(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#8217;|&#039;/g,"'").replace(/&#8211;/g,'–').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();}
export function parseNews(text,now=new Date()){
 const rows=JSON.parse(text);if(!Array.isArray(rows))throw Error('Invalid publisher feed');
 const stories=rows.filter(p=>/\bIsaias\b/i.test(p.title?.rendered)&&Date.parse(p.date_gmt+'Z')<=+now).map(p=>({title:stripHtml(p.title.rendered),url:p.link,publishedAt:p.date_gmt+'Z',source:'Tippah News',excerpt:stripHtml(p.excerpt.rendered).slice(0,300)})).filter(p=>{try{return new URL(p.url).hostname==='tippahnews.com';}catch{return false;}});
 return {issuedAt:stories[0]?.publishedAt||now.toISOString(),stories};
}
export async function collectWeather(source,previous,now=new Date(),request=fetch,config=WEATHER_CONFIG){
 const lastAttempt=now.toISOString();
 try{
 const get=async url=>{const r=await request(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'RCTV19Weather/1.0 (+https://rctv19.com/contact/)',Accept:'application/geo+json,application/json,text/html,application/xml'}});if(!r.ok){await r.body?.cancel();throw Error('HTTP '+r.status);}const text=await r.text();if(text.length>3000000)throw Error('Source response too large');return text;};
 let text=await get(source.url),data;
 if(source.kind==='forecast'){const point=JSON.parse(text).properties;const url=point?.forecast;if(!url||new URL(url).hostname!=='api.weather.gov')throw Error('Invalid NWS forecast URL');text=await get(url);data={...parseForecast(text,now),name:source.name,url};}
 else if(source.kind==='storm'){
 data=parseStorm(text,now,config);
 if(data.storm){
 // Supplementary products fail independently; never attach an unverified rotating slot.
 try{const page=await get(data.storm.advisoryUrl);const pre=page.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)?.[1]||page.replace(/<[^>]+>/g,' ');if(!pre.includes(config.stormId.toUpperCase())||!new RegExp('\\b'+config.stormName+'\\b','i').test(pre))throw Error('Advisory identity mismatch');data.storm.advisoryText=pre.trim();data.storm.advisoryError=null;}catch(e){data.storm.advisoryError=e.message;}
 try{let page=await get(data.storm.graphicsUrl);if(!page.toLowerCase().includes(config.stormId))throw Error('Graphics storm identity mismatch');const coneLink=[...page.matchAll(/href=["']([^"']+\?cone(?:#[^"']*)?)["']/gi)].map(m=>m[1])[0];if(coneLink)page=await get(nhcUrl(new URL(coneLink.replace(/&amp;/g,'&'),data.storm.graphicsUrl).href));const candidate=[...page.matchAll(/(?:src|href)\s*=\s*["']([^"']+\.png(?:\?[^"']*)?)["']/gi)].map(m=>m[1]).find(url=>url.toLowerCase().includes(config.stormId)&&/5day_cone(?!_sm|_es|_fr)/i.test(url));if(!candidate)throw Error('Verified storm cone unavailable');data.storm.trackImage=nhcUrl(new URL(candidate,data.storm.graphicsUrl).href);data.storm.trackError=null;}catch(e){data.storm.trackError=e.message;}
 }
 }else data=({radar:parseRadar,alerts:parseAlerts,news:parseNews}[source.kind])(text,now);
 return {id:source.id,lastAttempt,lastSuccess:lastAttempt,error:null,data};
 }catch(e){return {id:source.id,lastAttempt,lastSuccess:previous?.lastSuccess||null,error:e.message,data:previous?.data||null};}
}
export function assembleWeather(snapshots,now=new Date(),config=WEATHER_CONFIG){
 const sources=Object.fromEntries(SOURCES.map(s=>{const v=snapshots.find(v=>v.id===s.id);return [s.id,{...v,id:s.id,state:!v?.lastSuccess?'unavailable':v.error||+now-Date.parse(v.lastSuccess)>s.maxAge*60000?'delayed':'current',sourceUrl:s.url,intervalMinutes:s.minutes}];}));
 const a=sources.alerts;if(a.data)a.data={...a.data,alerts:a.data.alerts.filter(v=>Date.parse(v.expires)>+now&&Date.parse(v.effective||v.sent)<=+now)};
 const r=sources.radar;if(r.data&&+now-Date.parse(r.data.issuedAt)>15*60000)r.state='delayed';
 const s=sources.storm;if(s.data?.storm&&+now-Date.parse(s.data.issuedAt)>6*3600000)s.state='delayed';
 return {checkedAt:now.toISOString(),mode:modeAt(config,now),launchAt:config.launchAt,expiresAt:expiresAt(config),config,sources};
}
