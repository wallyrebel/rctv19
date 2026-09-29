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
