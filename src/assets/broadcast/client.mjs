import {SLIDE_MS,BREAK_MS,AD_MS,rundown,adSlot,currentWarnings} from './playout.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=s=>{try{const u=new URL(s,location.origin);return u.protocol==='https:'||u.origin===location.origin?u.href:'';}catch{return '';}};
const date=s=>new Date(s).toLocaleDateString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric'});
const time=s=>new Date(s).toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'});
let config={advertisingPhone:'662-576-1554',sponsors:[],audio:{}},data={},step=0,storyIndex=0,obitIndex=0,sportsPage=0,rendered='',current=null;
const started=Date.now();let lastStep=started,wasWarning=false;
const player=$('broadcast-audio');player.loop=true;
let musicSrc='',musicWanted=false;
const query=new URLSearchParams(location.search), debug=location.hostname==='127.0.0.1'||location.hostname==='localhost';
const forced=debug?query.get('slide'):null;
if(query.get('controls')==='1')player.controls=true;
async function playMusic(){if(musicWanted&&player.paused){try{await player.play();}catch{player.dataset.state='needs-interaction';}}}
addEventListener('pointerdown',()=>void playMusic());addEventListener('keydown',()=>void playMusic());
function audio(){
  const a=config.audio||{};musicWanted=a.enabled===true&&!!a.src&&query.get('audio')!=='off';
  if(!musicWanted){player.pause();return;}
  const src=url(a.src);if(!src)return;
  player.volume=Number.isFinite(a.volume)?Math.min(1,Math.max(0,a.volume)):.15;
  if(src!==musicSrc){musicSrc=src;player.src=src;player.load();}
  void playMusic();
}
function app(){return `<div class="panel app-promo"><p class="eyebrow">TAKE YOUR COMMUNITY WITH YOU</p><h2>Download the <em>RCTV 19 app</em> on Roku, Amazon Fire or Apple TV</h2><div class="platforms"><span>Roku</span><span>Amazon Fire</span><span>Apple TV</span></div><div class="url">Your community. Your channel. &nbsp; RCTV19.com</div></div>`;}
function house(){return `<div class="panel house-ad"><p class="eyebrow">CONNECT WITH YOUR COMMUNITY</p><h2>Your ad here</h2><p class="sub">Put your business on RCTV19.</p><div class="phone">${esc(config.advertisingPhone)}</div><p class="sub">Call to advertise</p></div>`;}
function ad(s){return s?.image?`<div class="sponsor-main"><img src="${esc(url(s.image))}" alt="${esc(s.name)}"></div>`:house();}
function story(s){
  if(!s)return app();
  return `<article class="story ${s.image?'':'no-image'}">${s.image?`<img class="story-photo" src="${esc(url(s.image))}" alt="">`:''}<div class="story-shade"></div><div class="story-copy"><p class="eyebrow">COMMUNITY NEWS</p><h2>${esc(s.title)}</h2>${s.excerpt?`<p class="summary">${esc(s.excerpt.slice(0,260))}${s.excerpt.length>260?'…':''}</p>`:''}<div class="byline"><span>${esc(s.source)} · ${date(s.publishedAt)}</span><span>Read more at ${esc(new URL(s.url).hostname.replace(/^www\./,''))}</span></div></div></article>`;
}
function forecast(){
  const f=data.forecast,periods=f?.periods?.filter(p=>Date.parse(p.end)>Date.now()).slice(0,4);if(!periods?.length)return app();
  return `<div class="panel"><p class="eyebrow">TIPPAH COUNTY WEATHER</p><h2>Your local forecast</h2><p class="sub">Ripley &amp; central Tippah County · National Weather Service</p><div class="forecast-grid">${periods.map(p=>`<div class="forecast-card"><h3>${esc(p.name)}</h3><strong>${esc(p.temperature)}°</strong><p>${esc(p.short)}</p><small>Wind ${esc(p.wind)}${p.rain!==null?`<br>Rain chance ${esc(p.rain)}%`:''}</small></div>`).join('')}</div><p class="forecast-detail">${esc(periods[0].detail)}</p></div>`;
}
function games(){return (data.games||[]).filter(g=>!g.stale&&!g.conflict&&(!g.freshUntil||Date.parse(g.freshUntil)>Date.now())&&['final','result','scheduled'].includes(g.status)&&(!(g.status==='scheduled')||g.date>=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date())));}
function sports(){
  const all=games();if(!all.length)return app();
  const slice=all.slice((sportsPage++%Math.ceil(all.length/4))*4).slice(0,4);
  return `<div class="panel"><p class="eyebrow">TIPPAH &amp; ALCORN • HIGH SCHOOL &amp; COLLEGE</p><h2>Local sports</h2>${slice.map(g=>`<div class="score-row"><div class="sport">${esc(g.sport)}<br><small>${date(g.date+'T12:00:00-05:00')}</small></div><div class="teams">${esc(g.teams[0])}<br>${esc(g.teams[1])}</div><div class="when">${g.status==='final'?`FINAL<br><span class="points">${g.scores.join(' – ')}</span>`:g.status==='result'?esc(g.result):esc(g.time.replace(/ · source time/,''))}</div></div>`).join('')}<p class="sub">${[...new Set(slice.map(g=>g.source))].map(esc).join(' • ')}</p></div>`;
}
function obituary(o){
  if(!o)return app();
  const life=d=>d?new Date(String(d).slice(0,10)+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',year:'numeric',month:'long',day:'numeric'}):'';
  // Show complete published service paragraphs that fit; never rewrite or cut a service time.
  const selected=[];let length=0;
  for(const p of o.services||[]){if(length+p.length<=650){selected.push(p);length+=p.length;}}
  return `<article class="obituary"><div>${o.image?`<img class="portrait" src="${esc(url(o.image))}" alt="${esc(o.name)}">`:'<div class="memorial">In loving<br>memory</div>'}</div><div class="obituary-copy"><p class="eyebrow">REMEMBERING OUR NEIGHBORS</p><h2>${esc(o.name)}</h2><div class="life-dates">${[life(o.birthDate),life(o.deathDate)].filter(Boolean).join(' – ')}</div><p class="home">${esc(o.funeralHome)}</p>${selected.map(p=>`<p class="service">${esc(p)}</p>`).join('')}<p class="more">Full obituary &amp; service information<br><strong>RCTV19.com/obituaries</strong></p></div></article>`;
}
function nextSlide(){
  const kind=forced||rundown[step%rundown.length];
  if(kind==='news')current={kind,item:data.stories?.[storyIndex++%(data.stories?.length||1)]};
  else if(kind==='obituary'){const valid=(data.obituaries||[]).filter(o=>Date.parse(o.publishedAt)>Date.now()-7*86400000);current={kind,item:valid[obitIndex++%(valid.length||1)]};}
  else current={kind};
}
function renderSlide(){
  if(!current)nextSlide();
  const c=current;
  $('stage').innerHTML=c.kind==='app'?app():c.kind==='ad'?house():c.kind==='weather'?forecast():c.kind==='sports'?sports():c.kind==='obituary'?obituary(c.item):story(c.item);
  $('stage').dataset.slide=c.kind;
  $('stage').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>img.hidden=true,{once:true}));
}
function crawl(id,items){
  const track=$(id),text=items.join(' • ');if(track.dataset.content===text)return;
  track.dataset.content=text;
  const copy=items.map(s=>`<span>${esc(s)}</span>`).join('');track.innerHTML=copy+copy;
  requestAnimationFrame(()=>track.style.setProperty('--duration',`${Math.max(35,track.scrollWidth/2/75)}s`));
}
function rails(){
  const p=data.forecast?.periods?.find(p=>Date.parse(p.end)>Date.now());
  $('weather-rail').innerHTML=p?`<h2>TIPPAH COUNTY</h2><div class="temp">${esc(p.temperature)}°</div><p>${esc(p.name)} · ${esc(p.short)}</p><small>Ripley forecast · NWS</small>`:'<h2>RIPLEY COMMUNITY<br>TELEVISION</h2><p>Your local connection.</p><small>News • Weather • Sports</small>';
  const sponsors=[...(config.sponsors||[]),null],s=sponsors[Math.floor((Date.now()-started)/20000)%sponsors.length];
  $('sponsor-rail').innerHTML=s?.image?`<img src="${esc(url(s.image))}" alt="${esc(s.name)}">`:`<div><div class="house-title">Your ad<br>here</div><p>Reach your community<br>with RCTV19.</p><div class="house-phone">${esc(config.advertisingPhone)}</div><p>Call to advertise</p></div>`;
  crawl('headlines',data.stories?.length?data.stories.map(s=>s.title):['RCTV19 · Ripley Community Television','Download the RCTV 19 app on Roku, Amazon Fire or Apple TV']);
  const local=games();$('ticker-label').textContent=local.length?'LOCAL SPORTS':'AROUND TOWN';
  crawl('sports-ticker',local.length?local.map(g=>`${g.sport} · ${date(g.date+'T12:00:00Z')} · ${g.teams[0]} ${g.status==='final'?g.scores[0]:'vs'} ${g.teams[1]}${g.status==='final'?' '+g.scores[1]+' · FINAL':g.status==='result'?' · '+g.result:' · '+g.time.replace(/ · source time/,'')}`):['News and community information at RCTV19.com','Advertise with RCTV19 · '+config.advertisingPhone]);
}
function tick(){
  const now=Date.now();$('clock').textContent=time(now);$('date').textContent=new Date(now).toLocaleDateString('en-US',{timeZone:'America/Chicago',weekday:'long',month:'long',day:'numeric'});
  if(data.forecast?.freshUntil&&Date.parse(data.forecast.freshUntil)<now){data.forecast=null;rails();if(current?.kind==='weather')rendered='';}
  const alerts=currentWarnings(data.alerts,now),warnings=alerts.filter(a=>a.interrupt),banner=alerts.filter(a=>!a.interrupt);
  const w=$('warning');w.hidden=!warnings.length;
  if(warnings.length){
    const a=warnings[Math.floor(now/20000)%warnings.length];
    const paragraphs=(a.instruction||a.description||'').match(/.{1,540}(?:\s|$)/g)||[];
    const page=Math.floor(now/20000)%Math.max(1,paragraphs.length);
    w.innerHTML=`<p class="eyebrow">NATIONAL WEATHER SERVICE • TIPPAH COUNTY</p><h2>${esc(a.event)}</h2><p class="warning-area">${esc(a.area)}</p><p class="warning-text">${esc(paragraphs[page]||a.headline)}</p><p class="warning-until">Until ${time(a.expires)} · ${date(a.expires)}</p><p class="warning-footer">${esc(a.headline)}</p>`;
    wasWarning=true;
  }else if(wasWarning){wasWarning=false;rendered='';lastStep=now;}
  $('alert-banner').hidden=!banner.length;$('channel').classList.toggle('has-advisory',!!banner.length);
  if(banner.length){const a=banner[Math.floor(now/15000)%banner.length];$('alert-banner').textContent=`${a.event} · ${a.area} · Until ${time(a.expires)}`;}
  const ads=[...(config.sponsors||[]),null];
  const slot=adSlot(now-started,ads.length);
  if(!warnings.length&&slot>=0){const key=`ad:${Math.floor((now-started)/BREAK_MS)}:${slot}`;if(rendered!==key){$('stage').innerHTML=ad(ads[slot]);$('stage').dataset.slide='ad';rendered=key;lastStep=now;}}
  else if(!warnings.length){
    if(now-lastStep>=SLIDE_MS){step++;lastStep=now;nextSlide();rendered='';}
    if(rendered!=='slide:'+step){renderSlide();rendered='slide:'+step;}
  }
}
async function refresh(){
  try {
    const r=await fetch('/broadcast/config.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(r.ok){config=await r.json();audio();}
    const endpoint=debug?'/api/broadcast':config.apiUrl;
    const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Feed unavailable');const next=await response.json();
    if(!Array.isArray(next.stories)||!Array.isArray(next.alerts))throw Error('Invalid feed');
    data=next;document.body.dataset.lastSuccess=new Date().toISOString();
    if(!current?.item&&step===0){nextSlide();rendered='';}
    rails();tick();
  }catch{document.body.dataset.feedState='offline';}
}
function resize(){document.documentElement.style.setProperty('--scale',Math.min(innerWidth/1920,innerHeight/1080));}
resize();addEventListener('resize',resize);rails();tick();void refresh();setInterval(()=>void refresh(),30000);setInterval(tick,1000);setInterval(rails,20000);
