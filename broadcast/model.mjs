export const centralDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit'}).format(now);
export const shiftDate = (day, n) => new Date(Date.parse(day+'T12:00:00Z') + n*86400000).toISOString().slice(0,10);
export function safeUrl(value, base='https://rctv19.com') {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { const u=new URL(value,base); return u.protocol==='https:' ? u.href : null; } catch { return null; }
}
export function canonical(value) {
  const url=safeUrl(value); if (!url) return '';
  const u=new URL(url); return u.hostname.replace(/^www\./,'')+u.pathname.replace(/\/+$/,'').toLowerCase();
}
const words = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
export function uniqueStories(input, now=new Date()) {
  const found=[],byLink=new Map(),byTitle=new Map();
  const candidates=input.filter(s=>s.title&&safeUrl(s.url)&&Date.parse(s.publishedAt)<=+now&&Date.parse(s.publishedAt)>+now-14*86400000)
    .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  for (const story of candidates) {
    const links=[canonical(story.url),canonical(story.originalUrl)].filter(Boolean);
    const title=words(story.title);
    const duplicate=links.map(link=>byLink.get(link)).find(Boolean)||byTitle.get(title);
    if (duplicate) {
      if (!duplicate.image && story.image) duplicate.image=safeUrl(story.image);
      for(const link of links)byLink.set(link,duplicate);byTitle.set(title,duplicate);continue;
    }
    const item={...story,image:safeUrl(story.image)};found.push(item);
    for(const link of links)byLink.set(link,item);byTitle.set(title,item);
  }
  // Give every publisher with recent unique stories a turn before taking its next story.
  const groups=new Map();for(const s of found){const key=s.source||'';const list=groups.get(key)||[];list.push(s);groups.set(key,list);}
  const output=[];
  for(let i=0;output.length<20;i++){
    const round=[...groups.values()].flatMap(list=>list[i]?[list[i]]:[]);if(!round.length)break;
    output.push(...round.slice(0,20-output.length));
  }
  return output;
}
export function recentObituaries(input, now=new Date()) {
  return [...new Map(input.filter(o=>o.name&&safeUrl(o.url)&&Date.parse(o.publishedAt)<=+now&&Date.parse(o.publishedAt)>=+now-7*86400000).map(o=>[canonical(o.url),o])).values()]
    .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
}
export function localTeam(name, level) {
  const n=words(name);
  if (/junior varsity|middle school|\bjv\b|\bjh\b/.test(n)) return false;
  if (level==='High school') return /^(ripley|walnut|falkner|pine grove|blue mountain|alcorn central|biggersville|corinth|kossuth)( |$)/.test(n);
  return /^(blue mountain christian|blue mountain college|northeast mississippi)( |$)/.test(n);
}
export function mergeGames(input, now=new Date()) {
  const day=centralDate(now), groups=new Map(), conflicts=[];
  for (const g of input) {
    if (g.conflict || g.stale || (g.freshUntil && Date.parse(g.freshUntil)<+now)) { if(g.conflict)conflicts.push(g); continue; }
    if (!g.teams?.some(t=>localTeam(t,g.level)) || g.date<shiftDate(day,-7) || g.date>shiftDate(day,14)) continue;
    if (!['scheduled','final','result','canceled','postponed'].includes(g.status) || g.status==='scheduled'&&g.date<day) continue;
    if (g.status==='final'&&(!Array.isArray(g.scores)||g.scores.length!==2||g.scores.some(s=>!Number.isFinite(s)))) continue;
    const team=t=>words(t).replace(/\b(tigers|wildcats|eagles|panthers|cougars|lions|warriors|aggies)\b/g,'').trim();
    const key=[g.date,words(g.sport).replace(/^boys football$/,'football'),...g.teams.map(team).sort()].join('|');
    const list=groups.get(key)||[]; list.push(g); groups.set(key,list);
  }
  const games=[];
  for (const list of groups.values()) {
    const finals=list.filter(g=>g.status==='final');
    const scoreKey=g=>g.teams.map((t,i)=>[words(t),g.scores[i]]).sort().map(x=>x.join(':')).join('|');
    if (new Set(finals.map(scoreKey)).size>1 && new Set(finals.map(g=>g.sourceId)).size>1) {conflicts.push(...list);continue;}
    // Multiple times from one provider may be a doubleheader. Collapse only identical event IDs/times.
    const seen=new Set();
    for(const g of list.sort((a,b)=>Number(b.status==='final')-Number(a.status==='final'))) {
      const k=g.start||g.time||g.id;
      if(seen.has(k))continue; seen.add(k); games.push(g);
    }
  }
  return {games:games.sort((a,b)=>a.date.localeCompare(b.date)||(a.start||a.time).localeCompare(b.start||b.time)), conflicts};
}
export function activeAlerts(input, now=new Date()) {
  return input.filter(a=>a.status==='Actual' && a.messageType!=='Cancel' && Date.parse(a.expires)>+now && Date.parse(a.effective||a.sent)<=+now)
    .sort((a,b)=>Number(b.interrupt)-Number(a.interrupt)||Date.parse(b.sent)-Date.parse(a.sent));
}
export function assemble(sources, snapshots, gaps, now=new Date()) {
  const byId=new Map(snapshots.map(s=>[s.id,s]));
  const health=sources.map(source=>{
    const s=byId.get(source.id); const age=s?.lastSuccess?(+now-Date.parse(s.lastSuccess))/60000:Infinity;
    return {...source, lastAttempt:s?.lastAttempt||null,lastSuccess:s?.lastSuccess||null,error:s?.error||null,failures:s?.failures||0,count:s?.count||0,state:!s?'pending':s.error?'error':age>source.maxAge?'stale':s.count?'healthy':'empty'};
  });
  const usable=id=>{const s=byId.get(id),source=sources.find(x=>x.id===id);return s?.lastSuccess && (+now-Date.parse(s.lastSuccess))/60000<=source.maxAge?s.data:null;};
  const live=sources.flatMap(s=>usable(s.id)?[usable(s.id)]:[]);
  const merged=mergeGames(live.flatMap(s=>s.games||[]),now);
  const forecast=usable('nws-forecast')?.forecast;
  const observation=usable('nws-current')?.observation;
  return {generatedAt:now.toISOString(),stories:uniqueStories(live.flatMap(s=>s.stories||[]),now),
    obituaries:recentObituaries(usable('rctv')?.obituaries||[],now),...merged,
    // A failed alert refresh must not clear a still-active warning; successful empty response does.
    alerts:activeAlerts(byId.get('nws-alerts')?.data?.alerts||[],now),
    forecast:forecast&&Date.parse(forecast.updatedAt)>+now-24*3600000?{...forecast,freshUntil:new Date(Date.parse(byId.get('nws-forecast').lastSuccess)+120*60000).toISOString()}:null,
    observation:observation&&Date.parse(observation.observedAt)>+now-2*3600000&&Date.parse(observation.observedAt)<=+now?observation:null,
    sources:health,gaps,upstream:usable('local-scores')?.upstream||[]};
}
