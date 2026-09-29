export const SLIDE_MS=16000, BREAK_MS=15*60000, AD_MS=15000;
export const rundown=['news','news','news','weather','news','news','sports','news','news','obituary','app'];
export function adSlot(elapsed,count) {
  if(elapsed<BREAK_MS)return -1;
  const phase=elapsed%BREAK_MS;
  return phase<Math.max(1,count)*AD_MS?Math.floor(phase/AD_MS):-1;
}
export function currentWarnings(alerts,now=Date.now()) {
  return (alerts||[]).filter(a=>a.status==='Actual'&&a.messageType!=='Cancel'&&Date.parse(a.expires)>now&&Date.parse(a.effective||a.sent)<=now);
}
export function forecastDays(periods,now=Date.now()) {
  const central=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d));
  const today=central(now),days=new Map();
  for(const p of periods||[]) {
    const key=central(p.start);if(key<today)continue;
    const d=days.get(key)||{date:key,name:new Date(key+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',weekday:'long'}),high:null,low:null,rain:null};
    if(p.isDaytime){d.high=p.temperature;d.short=p.short;d.wind=p.wind;}else{d.low=p.temperature;d.short||=p.short;}
    if(p.rain!==null)d.rain=Math.max(d.rain||0,p.rain);
    days.set(key,d);
  }
  return [...days.values()].slice(0,7);
}
