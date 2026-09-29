import {SOURCES,GAPS} from '../../broadcast/sources.mjs';
import {assemble} from '../../broadcast/model.mjs';
import {collect} from '../../broadcast/collect.mjs';

async function snapshots(env:Env) {
  const rows=await env.BROADCAST_DB.prepare('SELECT payload FROM snapshots').all<{payload:string}>();
  return rows.results.map(r=>JSON.parse(r.payload));
}
export default {
  async fetch(request,env) {
    if(new URL(request.url).pathname!=='/api/broadcast')return new Response('Not found',{status:404});
    if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
    try {
      const data=assemble(SOURCES,await snapshots(env),GAPS);
      const collector=await env.BROADCAST_DB.prepare('SELECT last_finished AS lastFinished FROM collector WHERE id=1').first();
      return Response.json({...data,collector},{headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'public,max-age=15','X-Content-Type-Options':'nosniff'}});
    } catch(error) {
      console.error(JSON.stringify({event:'read-failed',message:error instanceof Error?error.message:'unknown'}));
      return Response.json({error:'Broadcast data unavailable'},{status:503,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
    }
  },
  async scheduled(controller,env) {
    const now=new Date(controller.scheduledTime), old=await snapshots(env), byId=new Map(old.map(s=>[s.id,s]));
    // Every source has its own cadence; viewers never cause provider polling or database writes.
    for(const source of [...SOURCES].sort((a,b)=>a.minutes-b.minutes)) {
      const previous=byId.get(source.id);
      if(previous && +now-Date.parse(previous.lastAttempt)<source.minutes*60000)continue;
      const request:typeof fetch=source.id==='local-scores'?(url,init)=>env.SPORTS.fetch(url,init):fetch;
      const next=await collect(source,previous,now,request,env.CONTENT_URL);
      await env.BROADCAST_DB.prepare('INSERT INTO snapshots(id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload')
        .bind(source.id,JSON.stringify(next)).run();
      console.log(JSON.stringify({source:source.id,count:next.count,error:next.error}));
    }
    await env.BROADCAST_DB.prepare('INSERT INTO collector(id,last_finished) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET last_finished=excluded.last_finished')
      .bind(new Date().toISOString()).run();
  },
} satisfies ExportedHandler<Env>;
