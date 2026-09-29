import * as parse from './parsers.mjs';
import {centralDate,shiftDate} from './model.mjs';
export async function boundedText(response, limit=3000000) {
  if(!response.ok){await response.body?.cancel();throw Error(`HTTP ${response.status}`);}
  const reader=response.body?.getReader();if(!reader)throw Error('Empty response');
  const decoder=new TextDecoder();let size=0,text='';
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Response exceeds size limit');}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}
  finally{reader.releaseLock();}
}
export async function collect(source, previous, now=new Date(), request=fetch, contentUrl) {
  const stamp=now.toISOString();
  try {
    const url=source.id==='rctv'&&contentUrl?contentUrl:source.url;
    const get=async address=>boundedText(await request(address,{signal:AbortSignal.timeout(18000),headers:{
      'User-Agent':'RCTV19Broadcast/1.0 (+https://rctv19.com/contact/)',Accept:'application/geo+json,application/json,text/html;q=0.8'}}));
    let data;
    if(source.kind==='composite'){
      const games=[];
      for(let i=-7;i<=7;i++){
        const day=shiftDate(centralDate(now),i);
        games.push(...parse.composite(await get(url+'?d='+day),source,stamp,day).games);
      }
      data={games};
    }else data=parse[source.kind](await get(url),source,stamp);
    const count=(data.stories?.length||0)+(data.obituaries?.length||0)+(data.games?.length||0)+(data.alerts?.length||0)+(data.forecast?.periods?.length||0)+(data.observation?1:0);
    return {id:source.id,lastAttempt:stamp,lastSuccess:stamp,error:null,failures:0,count,data};
  } catch(e) {
    return {id:source.id,lastAttempt:stamp,lastSuccess:previous?.lastSuccess||null,error:e.message,failures:(previous?.failures||0)+1,count:previous?.count||0,data:previous?.data||{}};
  }
}
