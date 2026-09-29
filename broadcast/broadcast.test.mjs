import test from 'node:test';
import assert from 'node:assert/strict';
import {uniqueStories,recentObituaries,mergeGames,assemble,activeAlerts} from './model.mjs';
import {wordpress,schedule,alerts,composite,observation} from './parsers.mjs';
import {collect} from './collect.mjs';
import {SOURCES} from './sources.mjs';
import {adSlot,BREAK_MS,AD_MS,currentWarnings,forecastDays} from '../src/assets/broadcast/playout.mjs';
import {broadcastContent} from './content.cjs';
const now=new Date('2026-09-29T17:00:00Z');
const story={title:'County meeting scheduled',url:'https://tippahnews.com/local/meeting/',publishedAt:now.toISOString()};
test('Tippah feed enforces the category union and rejects unrelated posts',()=>{
 const posts=[7,2107,5].map((c,i)=>({id:i,categories:[c],title:{rendered:'Story'},link:`https://tippahnews.com/${i}`,date_gmt:'2026-09-29T15:00:00'}));
 assert.equal(wordpress(JSON.stringify(posts),SOURCES[0]).stories.length,2);
});
test('syndication dedup uses original URLs even after headline rewriting; keeps images',()=>{
 const list=uniqueStories([story,{...story,title:'Different rewritten heading',url:'https://rctv19.com/blog/meeting/',originalUrl:story.url,image:'https://rctv19.com/photo.jpg'}],now);
 assert.equal(list.length,1);assert.equal(list[0].image,'https://rctv19.com/photo.jpg');
 assert.equal(uniqueStories([story,{...story,url:'https://other.com/a',title:'Different actual story'}],now).length,2);
});
test('obituary window is seven days by publication, excludes future notices',()=>{
 const obit={name:'Example',url:'https://rctv19.com/obituaries/example/'};
 assert.equal(recentObituaries([1,6,8,-1].map((days,i)=>({...obit,url:obit.url+i,publishedAt:new Date(+now-days*86400000).toISOString()})),now).length,2);
});
test('obituary export preserves published service sentences and dates without rewriting',()=>{
 const service='Visitation will be Thursday, October 1, from 5 p.m. to 8 p.m.';
 const output=broadcastContent({obituaries:[{url:'/obituaries/a/',date:now,data:{title:'A',funeralHome:'Local home',birthDate:'1950-01-01'},templateContent:`<p>Other biography.</p><p>${service}</p>`}]});
 assert.deepEqual(output.obituaries[0].services,[service]);assert.equal(output.obituaries[0].birthDate,'1950-01-01');
});
test('Tippah schedule collapses reversed fixtures but keeps separate start times',()=>{
 const data={'itemListElement':['Ripley Tigers @ Walnut Wildcats','Walnut Wildcats vs Ripley Tigers'].map(t=>({item:{name:'Boys Football: '+t,startDate:'2026-10-02T19:00:00-05:00'}}))};
 const parsed=schedule(`<script id="tcs-sched-schema">${JSON.stringify(data)}</script>`,{id:'test',url:'https://tippahsports.com/schedule',name:'Test'},now.toISOString());
 assert.equal(mergeGames(parsed.games,now).games.length,1);
 assert.equal(mergeGames([...parsed.games,{...parsed.games[0],start:'2026-10-02T21:00:00-05:00'}],now).games.length,2);
});
test('conflicting finals, missing scores and stale data are withheld',()=>{
 const g={id:'1',sourceId:'a',level:'High school',sport:'Football',date:'2026-09-28',teams:['Ripley','Walnut'],status:'final',scores:[21,7],time:'Final'};
 assert.equal(mergeGames([g,{...g,sourceId:'b',scores:[20,7]}],now).games.length,0);
 assert.equal(mergeGames([{...g,scores:null},{...g,stale:true}],now).games.length,0);
});
test('NWS geography excludes neighboring counties and test messages do not interrupt',()=>{
 const props={id:'a',event:'Tornado Warning',status:'Actual',messageType:'Alert',sent:'2026-09-29T16:45:00Z',effective:'2026-09-29T16:45:00Z',expires:'2026-09-29T18:00:00Z'};
 const parsed=alerts(JSON.stringify({type:'FeatureCollection',features:[{properties:{...props,geocode:{SAME:['028139']}}},{properties:{...props,id:'b',geocode:{SAME:['028003']}}},{properties:{...props,id:'c',status:'Test',affectedZones:['https://api.weather.gov/zones/forecast/MSZ004']}}]}));
 assert.equal(parsed.alerts.length,2);assert.equal(activeAlerts(parsed.alerts,now).length,1);assert.equal(currentWarnings(parsed.alerts,+now).length,1);
 assert.equal(activeAlerts(parsed.alerts,new Date('2026-09-29T18:01:00Z')).length,0);
});
test('successful empty alert fetch clears warning; failure retains only until expiry',async()=>{
 const source=SOURCES.find(s=>s.id==='nws-alerts');
 const previous={id:source.id,lastSuccess:now.toISOString(),data:{alerts:[{id:'a',status:'Actual',messageType:'Alert',sent:now.toISOString(),expires:'2026-09-29T18:00:00Z'}]}};
 const failed=await collect(source,previous,now,async()=>new Response('',{status:503}));
 assert.equal(assemble([source],[failed],[],now).alerts.length,1);
 const empty=await collect(source,previous,now,async()=>Response.json({type:'FeatureCollection',features:[]}));
 assert.equal(assemble([source],[empty],[],now).alerts.length,0);
});
test('official numerical finals need the explicit Final label',()=>{
 const html=label=>`Composite Schedule <div class="event-row"><div class="list-event-sport">Football</div><div class="cal-status">${label}</div>${['Northeast Mississippi Community College','Northwest Mississippi Community College'].map(n=>`<div class="list-events-participants team"><span class="team-name" title="${n}"></span><span class="team-result">10</span></div>`).join('')}</div>`;
 const source={id:'northeast',name:'Official',url:'https://nemccathletics.com/composite'};
 assert.equal(composite(html('Final'),source,now.toISOString(),'2026-09-24').games[0].status,'final');
 assert.equal(composite(html('7:00 PM'),source,now.toISOString(),'2026-10-02').games[0].scores,null);
});
test('every fifteen minutes all four sponsors plus house ad get fifteen seconds',()=>{
 assert.equal(adSlot(BREAK_MS-1,5),-1);
 for(let i=0;i<5;i++)assert.equal(adSlot(BREAK_MS+i*AD_MS,5),i);
 assert.equal(adSlot(BREAK_MS+5*AD_MS,5),-1);
});
test('regional news does not crowd out a publisher with only one recent story',()=>{
 const input=Array.from({length:30},(_,i)=>({...story,title:'Regional news '+i,url:'https://regional.example/'+i,source:'Regional'}));
 const list=uniqueStories([...input,{...story,source:'Tippah',publishedAt:'2026-09-28T12:00:00Z'}],now);
 assert.equal(list.length,20);assert.ok(list.some(s=>s.source==='Tippah'));
});
test('seven-day forecast names real weekdays and keeps daily high/overnight low',()=>{
 const periods=Array.from({length:14},(_,i)=>({start:`2026-${i<4?'09':'10'}-${String(i<4?29+Math.floor(i/2):Math.floor(i/2)-1).padStart(2,'0')}T${i%2?'18':'06'}:00:00-05:00`,temperature:i%2?60:85,isDaytime:!(i%2),short:'Sunny',rain:20}));
 const days=forecastDays(periods,+now);assert.equal(days.length,7);assert.equal(days[0].name,'Tuesday');assert.equal(days[1].name,'Wednesday');assert.equal(days[6].name,'Monday');assert.equal(days[0].high,85);assert.equal(days[0].low,60);
});
test('current conditions convert NWS units and do not turn null readings into zero',()=>{
 const props={timestamp:now.toISOString(),temperature:{value:28,unitCode:'wmoUnit:degC'},heatIndex:{value:27,unitCode:'wmoUnit:degC'},windSpeed:{value:9.36,unitCode:'wmoUnit:km_h-1'},relativeHumidity:{value:32}};
 const o=observation(JSON.stringify({properties:props})).observation;
 assert.equal(o.temperature,82);assert.equal(o.feelsLike,81);assert.equal(o.wind,6);
 const missing=observation(JSON.stringify({properties:{...props,heatIndex:{value:null},windSpeed:{value:null},relativeHumidity:{value:null}}})).observation;
 assert.equal(missing.feelsLike,null);assert.equal(missing.wind,null);assert.equal(missing.humidity,null);
});
