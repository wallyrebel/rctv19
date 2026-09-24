// MediaMTX uses a new segment-name prefix and restarts its counters whenever
// ingest reconnects. Preserve a public HLS timeline across those source epochs.
// The last public playlist is sufficient state, including across broadcast PCs.
const marker='#MISSISSIPPI-CONTINUITY:1';
function parse(text) {
 const lines=text.trim().split(/\r?\n/);
 const sequence=Number(lines.find(x=>x.startsWith('#EXT-X-MEDIA-SEQUENCE:'))?.split(':')[1]);
 const uris=lines.filter(x=>x && !x.startsWith('#'));
 const first=uris[0]?.match(/^(.*)_seg(\d+)\.ts$/);
 if(!Number.isSafeInteger(sequence)||sequence<0||!first||!uris.length) throw new Error('Unexpected MediaMTX HLS timeline');
 if(uris.some((uri,i)=>uri!==`${first[1]}_seg${Number(first[2])+i}.ts`)) throw new Error('Nonconsecutive MediaMTX segments');
 const discontinuities=lines.filter(x=>x==='#EXT-X-DISCONTINUITY').length;
 if(discontinuities>1) throw new Error('Unexpected source discontinuities');
 const disc=Number(lines.find(x=>x.startsWith('#EXT-X-DISCONTINUITY-SEQUENCE:'))?.split(':')[1]||0);
 if(!Number.isSafeInteger(disc)||disc<0) throw new Error('Invalid discontinuity sequence');
 return {lines,sequence,uris,source:first[1],local:Number(first[2]),disc,boundary:discontinuities===1,cc:disc+discontinuities};
}

export function continueMediaPlaylist(raw,previous) {
 const current=parse(raw),old=previous?parse(previous):null;
 if(current.sequence!==current.local || current.boundary) throw new Error('Only raw MediaMTX MPEG-TS input is supported');
 let offset=0,cc=0,boundary=false;
 if(old) {
  if(old.source===current.source && previous.includes(marker)) {
   if(current.local<old.local) throw new Error('Stale local playlist');
   offset=old.sequence-old.local;cc=old.cc;
   boundary=old.boundary && old.uris[0]===current.uris[0];
  } else {
   offset=old.sequence+old.uris.length-current.local;
   cc=old.cc+1;boundary=true;
  }
 }
 const outputSequence=current.sequence+offset;
 if(!Number.isSafeInteger(outputSequence)||outputSequence<0) throw new Error('Invalid output sequence');
 let output=current.lines.filter(line=>!line.startsWith('#EXT-X-DISCONTINUITY-SEQUENCE:') && line!==marker)
  .map(line=>line.startsWith('#EXT-X-MEDIA-SEQUENCE:')?`#EXT-X-MEDIA-SEQUENCE:${outputSequence}`:line);
 output.splice(1,0,marker,`#EXT-X-DISCONTINUITY-SEQUENCE:${boundary?cc-1:cc}`);
 if(boundary) {
  let at=output.findIndex(line=>line.startsWith('#EXT-X-PROGRAM-DATE-TIME:')||line.startsWith('#EXTINF:'));
  output.splice(at,0,'#EXT-X-DISCONTINUITY');
 }
 return output.join('\n')+'\n';
}
