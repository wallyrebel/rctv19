import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {SOURCES,GAPS} from '../broadcast/sources.mjs';
import {collect} from '../broadcast/collect.mjs';
import {assemble} from '../broadcast/model.mjs';
const root=resolve('_site');let snapshots=[];let lastFinished=null;
await mkdir('.research',{recursive:true});
try{snapshots=JSON.parse(await readFile('.research/snapshots.json','utf8'));}catch{}
const mime={'.html':'text/html','.json':'application/json','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
async function refresh(){
 for(const s of SOURCES){const previous=snapshots.find(v=>v.id===s.id);if(previous&&Date.now()-Date.parse(previous.lastAttempt)<s.minutes*60000)continue;
  const value=await collect(s,previous,new Date(),fetch,'http://127.0.0.1:4322/broadcast/content.json');
  snapshots=snapshots.filter(v=>v.id!==s.id);snapshots.push(value);console.log(s.id,value.count,value.error||'OK');
 }
 lastFinished=new Date().toISOString();await writeFile('.research/snapshots.json',JSON.stringify(snapshots));
}
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path==='/api/broadcast'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({...assemble(SOURCES,snapshots,GAPS),collector:{lastFinished}}));return;}
  let file=resolve(root,'.'+path);if(!file.startsWith(root+'\\')&&file!==root){res.writeHead(403).end();return;}
  if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  const bytes=await readFile(file);res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  if(req.headers.range){const match=req.headers.range.match(/bytes=(\d+)-(\d*)/);if(match){const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Accept-Ranges':'bytes','Content-Length':end-start+1});res.end(bytes.subarray(start,end+1));return;}}
  res.end(bytes);
 }catch{res.writeHead(404).end('Not found');}
});
server.listen(4322,'127.0.0.1',()=>{console.log('RCTV19 preview: http://127.0.0.1:4322/broadcast');void refresh().then(()=>{setInterval(()=>void refresh(),60000);});});
