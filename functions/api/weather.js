import {weatherFromCache} from '../../weather/cache.mjs';
export async function onRequest(context){
 if(context.request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
 try{
 const data=await weatherFromCache(caches.default,new URL(context.request.url).origin);
 return Response.json(data,{headers:{'Cache-Control':'public,max-age=15','X-Content-Type-Options':'nosniff'}});
 }catch{
 return Response.json({error:'Weather data unavailable'},{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
}
