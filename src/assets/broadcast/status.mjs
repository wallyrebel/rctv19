const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=s=>s?new Date(s).toLocaleString('en-US',{timeZone:'America/Chicago'})+' CT':'Never';
async function refresh(){try{
 const config=await (await fetch('/broadcast/config.json',{cache:'no-store'})).json();
 const local=['localhost','127.0.0.1'].includes(location.hostname);
 const response=await fetch(local?'/api/broadcast':config.apiUrl,{cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(`HTTP ${response.status}`);const d=await response.json();
 $('summary').textContent=`${d.stories.length} unique stories · ${d.obituaries.length} obituaries · ${d.games.length} sports events · ${d.alerts.length} active weather alerts · ${d.conflicts.length} score conflicts held`;
 $('heartbeat').textContent=`Collector finished: ${stamp(d.collector?.lastFinished)}. Dashboard checked: ${stamp(new Date())}`;
 $('sources').innerHTML=`<table><thead><tr><th>Source</th><th>Status</th><th>Items</th><th>Refresh</th><th>Last success</th><th>Issue</th></tr></thead><tbody>${d.sources.map(s=>`<tr><td>${esc(s.name)}</td><td class="${esc(s.state)}">${esc(s.state)}</td><td>${s.count}</td><td>${s.minutes} min</td><td>${stamp(s.lastSuccess)}<small>Attempt: ${stamp(s.lastAttempt)}</small></td><td>${esc(s.error||'—')}</td></tr>`).join('')}</tbody></table>`;
 $('gaps').innerHTML=d.gaps.map(g=>`<p><strong>${esc(g.name)}:</strong> ${esc(g.note)}</p>`).join('');
 $('upstream').innerHTML=(d.upstream||[]).map(s=>`<p><strong>${esc(s.name)}</strong> · ${esc(s.state)} · ${stamp(s.lastSuccess)} ${esc(s.error||'')}</p>`).join('')||'Sports provider information pending.';
 $('configuration').textContent=`Music: ${config.audio?.enabled?'enabled (continuous loop)':'awaiting RCTV19 music file'}. Sponsors: ${config.sponsors?.length||0}. Advertising: ${config.advertisingPhone}. Main ad break: every 15 minutes, 15 seconds per sponsor plus Your ad here. App promotion is part of regular rotation.`;
}catch(e){$('summary').textContent='Unable to refresh dashboard: '+e.message;}}
void refresh();setInterval(()=>void refresh(),30000);
