export const SOURCES = [
  {id:'tippah-news', name:'Tippah News · Tippah County / Ripley', kind:'wordpress', url:'https://tippahnews.com/wp-json/wp/v2/posts?categories=7,2107&per_page=30&_embed', categories:[7,2107], minutes:10, maxAge:1440},
  {id:'tippah-sports', name:'Tippah Sports', kind:'wordpress', url:'https://tippahsports.com/wp-json/wp/v2/posts?per_page=30&_embed', minutes:10, maxAge:1440},
  {id:'alcorn-news', name:'Alcorn News MS', kind:'wordpress', url:'https://alcornnewsms.com/wp-json/wp/v2/posts?per_page=30&_embed', minutes:10, maxAge:1440},
  ...[['union-news','Union News MS','unionnewsms.com'],['desoto-news','DeSoto County News','desotocountynews.com'],['prentiss-news','Prentiss News','prentissnews.com'],['tupelo-news','News Tupelo','newstupelo.com'],['sports-ms','Sports Mississippi','sportsmississippi.com']].map(([id,name,host])=>({id,name,kind:'wordpress',url:`https://${host}/wp-json/wp/v2/posts?per_page=30&_embed`,minutes:10,maxAge:1440})),
  {id:'rctv', name:'RCTV19 · News and obituaries', kind:'rctv', url:'https://rctv19.com/broadcast/content.json', minutes:10, maxAge:1440},
  {id:'tippah-schedule', name:'Tippah Sports · Schedule', kind:'schedule', url:'https://tippahsports.com/schedule/', minutes:720, maxAge:1560},
  {id:'local-scores', name:'Mississippi Sports · Local scores / college calendars', kind:'sports', url:'https://mississippi-sports-broadcast.myersgrouponline.workers.dev/api/broadcast', minutes:720, maxAge:1560},
  {id:'northeast', name:'Northeast Mississippi · Official athletics', kind:'composite', url:'https://nemccathletics.com/composite', minutes:720, maxAge:1560},
  {id:'nws-alerts', name:'NWS · Tippah County alerts', kind:'alerts', url:'https://api.weather.gov/alerts/active?area=MS', minutes:1, maxAge:5},
  {id:'nws-forecast', name:'NWS · Tippah / Ripley forecast', kind:'forecast', url:'https://api.weather.gov/gridpoints/MEG/83,50/forecast', minutes:15, maxAge:120},
  {id:'nws-current', name:'NWS · Current conditions at Corinth (KCRX)', kind:'observation', url:'https://api.weather.gov/stations/KCRX/observations/latest', minutes:10, maxAge:120},
].map(s=>s.kind==='wordpress'?{...s,url:s.url+'&_fields=id,link,date_gmt,title,excerpt,categories,_links,_embedded'}:s);
export const GAPS = [
  {name:'Local high-school scores', note:'Only confirmed structured finals are aired. MaxPreps currently blocks the existing cloud collector; Tippah Sports supplies schedules, not a complete score feed. Sports headlines still run.'},
  {name:'Alcorn County schedules', note:'Alcorn Central, Biggersville, Corinth and Kossuth are included in local filtering. AlcornSportsMS.com/schedule returns 404; comprehensive standalone Alcorn schedules are not yet verified.'},
  {name:'College coverage', note:'Blue Mountain Christian uses its official calendar through the existing sports collector. Northeast’s official composite is parsed and tested but returns HTTP 403 to the cloud collector. Its coverage remains unavailable until an accessible official feed is supplied; locally fetched data is not passed off as a working cloud feed.'},
  {name:'Weather coverage', note:'Forecast represents Ripley / central Tippah County. Alerts match all of Tippah County (MSC139 / MSZ004 / SAME 028139). Weather collection runs every minute independently of vMix.'},
];
