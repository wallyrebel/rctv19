import {load} from 'cheerio/slim';
import {safeUrl,localTeam} from './model.mjs';
export const plain = s => load(String(s||'')).text().replace(/\s+/g,' ').trim();
export function wordpress(raw, source) {
  const posts=JSON.parse(raw); if(!Array.isArray(posts))throw Error('WordPress response is not a posts list');
  return {stories:posts.flatMap(p=>{
    if(source.categories && !p.categories?.some(c=>source.categories.includes(c)))return [];
    const url=safeUrl(p.link), date=p.date_gmt?`${p.date_gmt.replace(/Z$/,'')}Z`:null;
    if(!url||!p.title?.rendered||!Number.isFinite(Date.parse(date)))return [];
    return [{id:`${source.id}:${p.id}`,title:plain(p.title.rendered),url,originalUrl:url,
      publishedAt:date,image:safeUrl(p._embedded?.['wp:featuredmedia']?.[0]?.source_url),
      excerpt:plain(p.excerpt?.rendered).replace(/\[.*?\]$/,'').slice(0,360),source:source.name.replace(/ ·.*/, '')}];
  })};
}
export function schedule(raw, source, stamp) {
  const $=load(raw), data=$('#tcs-sched-schema').text();
  if(!data)throw Error('Structured sports schedule missing');
  const list=JSON.parse(data);if(!Array.isArray(list.itemListElement))throw Error('Schedule list not recognized');
  const games=list.itemListElement.flatMap(({item:e})=>{
    const parts=e?.name?.match(/^[^A-Za-z]*([^:]+):\s*(.+?)\s+(?:@|vs\.?)\s+(.+)$/);
    if(!parts||!Number.isFinite(Date.parse(e.startDate))||/\b(JV|middle school|junior varsity)\b/i.test(e.name))return [];
    const teams=[parts[2],parts[3]],start=e.startDate;
    return [{id:`${source.id}:${start}:${teams.join(':')}`,sourceId:source.id,source:source.name,sourceUrl:source.url,
      level:'High school',sport:parts[1],teams,start,date:start.slice(0,10),scores:null,
      status:/Cancelled/i.test(e.eventStatus)?'canceled':/Postponed/i.test(e.eventStatus)?'postponed':'scheduled',
      time:new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'}).format(new Date(start)),
      location:plain(e.location?.name),observedAt:stamp}];
  });
  return {games};
}
export function sports(raw) {
  const data=JSON.parse(raw);if(!Array.isArray(data.games)||!Array.isArray(data.sources))throw Error('Sports feed format changed');
  return {games:data.games.filter(g=>g.teams?.some(t=>localTeam(t,g.level))),
    upstream:data.sources.filter(s=>s.id==='bmc'||s.id==='maccc'||s.id.startsWith('maxpreps-')).map(s=>({name:s.name,state:s.state,lastSuccess:s.lastSuccess,error:s.error}))};
}
export function composite(raw,source,stamp,date) {
  const $=load(raw);if(!/Composite Schedule|Composite Calendar/i.test($.root().text()))throw Error('Official composite markup missing');
  const games=[];
  $('.event-row').each((i,el)=>{
    const e=$(el),rows=e.find('.list-events-participants.team'),sport=plain(e.find('.list-event-sport').text()),label=plain(e.find('.cal-status').text());
    if(/junior varsity|\bJV\b/i.test(sport))return;
    let teams,scores=null,status='scheduled',result;
    if(rows.length===2){
      teams=rows.map((_,r)=>plain($(r).find('.team-name').attr('title'))).get();
      const values=rows.map((_,r)=>plain($(r).find('.team-result').text())).get();
      if(values.every(v=>/^\d{1,3}$/.test(v))&&/\bFinal\b/i.test(label)){scores=values.map(Number);status='final';}
      else if(/\bFinal\b/i.test(label))return;
    }else{
      const opponent=plain(e.find('.team-name').attr('title'));if(!opponent)return;
      teams=['Northeast Mississippi Community College',opponent];
      if(/\bFinal\b/i.test(label)){status='result';result=plain(e.find('.event-result').text());if(!result)return;}
    }
    if(/cancel/i.test(label))status='canceled';else if(/postpon/i.test(label))status='postponed';
    else if(/half|\b[1-4](st|nd|rd|th)\b|in.progress/i.test(label))return;
    const link=safeUrl(e.find('a').filter((_,a)=>/Box Score/i.test($(a).text())).attr('href'),source.url)||source.url;
    games.push({id:`${source.id}:${date}:${sport}:${i}`,sourceId:source.id,source:source.name,sourceUrl:link,
      level:'JUCO',sport,teams,scores,status,result,date,time:label,observedAt:stamp});
  });
  return {games};
}
export function alerts(raw) {
  const data=JSON.parse(raw);if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('NWS alerts response is not a collection');
  const relevant=data.features.map(f=>f.properties).filter(p=>p&&(p.affectedZones?.some(z=>/\/(MSC139|MSZ004)$/.test(z))||p.geocode?.SAME?.includes('028139')||p.geocode?.UGC?.some(z=>['MSC139','MSZ004'].includes(z))));
  return {alerts:relevant.map(p=>({id:p.id,event:plain(p.event),headline:plain(p.headline),description:plain(p.description),instruction:plain(p.instruction),
    area:plain(p.areaDesc),sent:p.sent,effective:p.effective,expires:p.ends||p.expires,status:p.status,messageType:p.messageType,
    interrupt:['Tornado Warning','Severe Thunderstorm Warning','Flash Flood Warning'].includes(p.event),source:'National Weather Service',url:safeUrl(p['@id'])}))};
}
export function forecast(raw) {
  const data=JSON.parse(raw),p=data.properties;
  if(!p?.updateTime||!Array.isArray(p.periods)||!p.periods.length)throw Error('NWS forecast periods missing');
  return {forecast:{updatedAt:p.updateTime,periods:p.periods.slice(0,10).map(x=>({name:plain(x.name),start:x.startTime,end:x.endTime,
    temperature:x.temperature,unit:x.temperatureUnit,wind:plain(`${x.windSpeed} ${x.windDirection}`),
    short:plain(x.shortForecast),detail:plain(x.detailedForecast),rain:x.probabilityOfPrecipitation?.value??null,isDaytime:x.isDaytime}))}};
}
export function rctv(raw) {
  const data=JSON.parse(raw);if(!Array.isArray(data.stories)||!Array.isArray(data.obituaries))throw Error('RCTV19 broadcast content feed missing');
  return data;
}
