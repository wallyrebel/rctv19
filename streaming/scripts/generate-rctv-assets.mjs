import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'assets/source-logo.jpg');
async function save(relative, w, h, title, opaque = false) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), {recursive:true});
  const logo = await sharp(source).resize(Math.round(w*.82), Math.round(h*(title ? .52 : .82)), {fit:'inside'}).png().toBuffer();
  const meta = await sharp(logo).metadata();
  const layers = [{input:logo,left:Math.round((w-meta.width)/2),top:Math.round((h-meta.height)/2 - (title ? h*.11 : 0))}];
  if(title) layers.push({input:Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect y="${Math.round(h*.73)}" width="${w}" height="${h}" fill="#34358c"/><text x="50%" y="${Math.round(h*.91)}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${Math.round(h*.105)}" fill="#ffe100">${title}</text></svg>`),left:0,top:0});
  let image = sharp({create:{width:w,height:h,channels:3,background:'#ffffff'}}).composite(layers);
  if (opaque) image = image.flatten({background:'#ffffff'}).removeAlpha();
  await image.png().toFile(file);
}
for(const [file,w,h,title,opaque] of [
 ['apps/roku/images/icon.png',540,405],['apps/roku/images/icon-hd.png',290,218],['apps/roku/images/splash.png',1280,720],
 ['apps/roku/images/live-cover.png',640,360,'WATCH LIVE'],['apps/roku/images/show-placeholder.png',640,360,'ON DEMAND'],
 ['apps/fire-tv/app/src/main/res/drawable/app_icon.png',192,192],['apps/fire-tv/app/src/main/res/drawable/banner.png',320,180],
 ['apps/fire-tv/app/src/main/res/drawable/live_cover.png',640,360,'WATCH LIVE'],['apps/fire-tv/app/src/main/res/drawable/show_placeholder.png',640,360,'ON DEMAND'],
 ['assets/store/amazon-fire-tv-1280x720.png',1280,720],['assets/store/amazon-icon-114.png',114,114],['assets/store/amazon-icon-512.png',512,512],
 ['assets/store/amazon-background-1920x1080.png',1920,1080,undefined,true],
 ['assets/store/roku-poster-540x405.png',540,405],['public/assets/logo.png',768,292],
 ['public/assets/live-cover.png',640,360,'WATCH LIVE'],['public/assets/show-placeholder.png',640,360,'ON DEMAND'],
]) await save(file,w,h,title,opaque);
await copyFile(source,path.join(root,'public/assets/source-logo.jpg'));
console.log('RCTV 19 original logo and platform artwork prepared.');
