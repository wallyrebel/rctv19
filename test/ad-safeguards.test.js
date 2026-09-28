const {test}=require('node:test');
const assert=require('node:assert/strict');
const nunjucks=require('nunjucks');
const fs=require('node:fs');
const env=new nunjucks.Environment(new nunjucks.FileSystemLoader('src/_includes'),{autoescape:true});
env.addFilter('validPublisher',v=>/^ca-pub-\d{16}$/.test(v||''));
env.addFilter('validSlot',v=>/^\d+$/.test(v||''));
env.addFilter('optimizedImage',v=>v);
// Render the real shared loader without unrelated page metadata and navigation.
const loader=fs.readFileSync('src/_includes/layouts/base.njk','utf8').split('<meta name="viewport"')[0];
test('Auto ads inherit global eligibility on new pages and articles, with one shared loader',()=>{
  const defaults={ads:require('../src/_data/ads.json'),adsEligible:require('../src/_data/adsEligible.json')};
  const article={...defaults,...require('../src/blog/blog.json')};
  const obituary={...defaults,...require('../src/obituaries/obituaries.json')};
  for(const data of [defaults,article,obituary]) {
    const html=env.renderString(loader,data);
    assert.equal((html.match(/<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-3245500092050206" crossorigin="anonymous"><\/script>/g)||[]).length,1);
  }
  for(const data of [
    {...defaults,adsEligible:false},
    {...defaults,noindex:true},
    {...defaults,ads:{...defaults.ads,adsenseEnabled:false}},
    {...defaults,ads:{...defaults.ads,adsensePublisherId:'PLACEHOLDER'}}
  ]) assert.doesNotMatch(env.renderString(loader,data),/<script/);
});
test('ad slots require enabled serving, page eligibility and a valid slot',()=>{
  const data={slotName:'test',adsEligible:true,ads:{adsenseEnabled:true,adsensePublisherId:'ca-pub-3245500092050206',test:{type:'adsense',enabled:true,slot:'1234567890'}}};
  const render=d=>env.render('components/ad-slot.njk',d);
  assert.match(render(data),/<ins class="adsbygoogle"/);
  assert.doesNotMatch(render({...data,adsEligible:false}),/<ins/);
  assert.doesNotMatch(render({...data,noindex:true}),/<ins/);
  assert.doesNotMatch(render({...data,ads:{...data.ads,adsenseEnabled:false}}),/<ins/);
  assert.doesNotMatch(render({...data,ads:{...data.ads,test:{...data.ads.test,slot:'PLACEHOLDER'}}}),/<ins/);
});
