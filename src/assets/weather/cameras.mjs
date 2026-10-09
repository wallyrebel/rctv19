// Public MDOT sources verified from each official streamcam player.
// The owner confirmed permission for Mississippi rebroadcast.
export const CAMERAS=[
 {id:'050303',name:'Biloxi · I-110 at US 90',url:'https://streaminglym2.mdottraffic.com/rtplive/050303.stream/playlist.m3u8'},
 {id:'050204',name:'Gulfport · US 90 at US 49',url:'https://streaminglym3.mdottraffic.com/rtplive/050204.stream/playlist.m3u8'},
 {id:'052618',name:'Bay St. Louis · US 90 at Main St',url:'https://streaminglym3.mdottraffic.com/rtplive/052618.stream/playlist.m3u8'}
];
export const ROTATION=['cameras','alerts','forecast','cameras','news','track'];
export function panelFor({view,index=0,cameraOverride=false,hasWarnings=false}){
 const panel=cameraOverride?'cameras':view==='rotating'?ROTATION[index%ROTATION.length]:'alerts';
 return panel==='alerts'&&hasWarnings?'warning':panel;
}
export function cameraFor(index=0,id){return CAMERAS.find(c=>c.id===id)||CAMERAS[Math.floor(index/3)%CAMERAS.length];}
export function cameraHtml(camera,broadcast=false){return `<div class="camera-view camera-player" data-camera-id="${camera.id}">
 ${broadcast?`<h3 class="camera-location">${camera.name}</h3>`:`<label class="camera-selector">Mississippi coastal camera <select data-coastal-camera aria-label="Mississippi coastal camera">${CAMERAS.map(c=>`<option value="${c.id}" ${c.id===camera.id?'selected':''}>${c.name}</option>`).join('')}</select></label>`}
 <div class="camera-video-wrap"><video autoplay muted playsinline ${broadcast?'':'controls'} aria-label="MDOT ${camera.name}"></video><span class="camera-credit">MDOTtraffic.com</span><button class="camera-play" type="button" hidden>Play camera</button></div>
 <p class="camera-playback" role="status">Connecting to MDOT video…</p>
 <p class="source-note">MDOT · Capture time unavailable. Video may be delayed. An interrupted or frozen view does not confirm current conditions.</p>
 <a class="camera-official" href="https://www.mdottraffic.com/mapbubbles/streamcam.aspx?cam=${camera.id}" target="_blank" rel="noopener">Open official MDOT player</a>
 </div>`;}
const players=new Map();let library;
const loadHls=()=>library||(library=import('./hls-1.7.3.mjs'));
function message(player,text,state=''){player.root.querySelector('.camera-playback').textContent=text;player.root.dataset.playback=state;}
function destroy(player){player.abort.abort();player.hls?.destroy();player.video.pause();player.video.removeAttribute('src');player.video.load();players.delete(player.root);}
function mount(root){
 const camera=CAMERAS.find(c=>c.id===root.dataset.cameraId);if(!camera)return;
 const video=root.querySelector('video'),button=root.querySelector('.camera-play');
 const player={root,video,id:camera.id,hls:null,abort:new AbortController(),progress:Date.now(),time:0,retry:Date.now()+20000,blocked:false};
 players.set(root,player);message(player,"Connecting to MDOT video…","connecting");video.muted=true;video.defaultMuted=true;video.autoplay=true;video.playsInline=true;
 const play=()=>video.play().then(()=>{player.blocked=false;button.hidden=true;}).catch(error=>{if(!root.isConnected||players.get(root)!==player)return;if(error.name==='NotAllowedError'){player.blocked=true;button.hidden=false;message(player,'Playback paused — select Play camera.','paused');}else message(player,'VIDEO UNAVAILABLE · Retrying connection…','unavailable');});
 button.addEventListener('click',play,{signal:player.abort.signal});
 video.addEventListener('playing',()=>{player.progress=Date.now();player.blocked=false;button.hidden=true;message(player,'VIDEO PLAYING · MDOT','playing');},{signal:player.abort.signal});
 video.addEventListener('timeupdate',()=>{if(video.currentTime!==player.time){player.time=video.currentTime;player.progress=Date.now();message(player,'VIDEO PLAYING · MDOT','playing');}},{signal:player.abort.signal});
 video.addEventListener('error',()=>message(player,'VIDEO UNAVAILABLE · Retrying connection…','unavailable'),{signal:player.abort.signal});
 (async()=>{try{
   if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=camera.url;void play();return;}
   const {default:Hls}=await loadHls();if(!root.isConnected||players.get(root)!==player)return;
   if(!Hls.isSupported())throw Error('Unsupported playback');
   const hls=player.hls=new Hls({enableWorker:true,lowLatencyMode:false,backBufferLength:15,maxBufferLength:12});
   hls.on(Hls.Events.MANIFEST_PARSED,()=>void play());
   hls.on(Hls.Events.ERROR,(_,error)=>{if(error.fatal)message(player,'VIDEO UNAVAILABLE · Retrying connection…','unavailable');});
   hls.loadSource(camera.url);hls.attachMedia(video);
 }catch{message(player,'VIDEO UNAVAILABLE · Open the official MDOT player.','unavailable');}})();
}
export function syncCameraPlayers(){
 for(const player of players.values())if(!player.root.isConnected||player.id!==player.root.dataset.cameraId)destroy(player);
 for(const root of document.querySelectorAll('.camera-player'))if(!players.has(root)&&(!document.body.classList.contains('broadcast')||!root.closest('.public-section')))mount(root);
}
export function initCameras(){
 document.addEventListener('change',event=>{const select=event.target;if(!select.matches('[data-coastal-camera]'))return;const camera=CAMERAS.find(c=>c.id===select.value);if(!camera)return;const root=select.closest('.camera-player');root.dataset.cameraId=camera.id;root.querySelector('.camera-official').href='https://www.mdottraffic.com/mapbubbles/streamcam.aspx?cam='+camera.id;root.querySelector('video').setAttribute('aria-label','MDOT '+camera.name);syncCameraPlayers();});
 setInterval(()=>{for(const player of [...players.values()]){
   if(!player.root.isConnected){destroy(player);continue;}
   if(player.blocked)continue;
   if(Date.now()-player.progress>15000){message(player,'VIDEO INTERRUPTED · Last image may be stale. Reconnecting…','delayed');if(Date.now()>player.retry){const root=player.root;destroy(player);mount(root);}}
 }},2000);
 addEventListener('pagehide',()=>{for(const player of [...players.values()])destroy(player);});
 syncCameraPlayers();
}
