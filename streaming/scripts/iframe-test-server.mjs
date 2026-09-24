import http from 'node:http';
const publicFeed=process.argv.includes('--public');
const player=publicFeed
 ? 'https://watch.rctv19.com/embed/rctv19/?muted=1&amp;autoplay=1'
 : 'http://127.0.0.1:4174/embed/rctv19?video=playback-test&amp;muted=1&amp;autoplay=1';
const port=Number(process.env.PORT || 4175);
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Embed verification</title></head><body style="background:#edf0f3;font:16px system-ui;padding:30px;color:#182633"><h1>Website embed verification</h1><p>Local test page. Frames below load ${publicFeed?'the public RCTV 19 live player':'a sample that is not station programming'} from a different origin.</p><div style="display:flex;gap:30px;flex-wrap:wrap"><section><h2>Desktop embed</h2><iframe src="${player}" title="Desktop playback test" style="width:640px;height:360px;border:0" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen></iframe></section><section><h2>Mobile-width embed</h2><iframe src="${player}" title="Mobile-width playback test" style="width:390px;height:220px;border:0" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen></iframe></section></div></body></html>`;
http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(page)}).listen(port,'127.0.0.1',()=>console.log(`Cross-origin embed test: http://127.0.0.1:${port}/`));
