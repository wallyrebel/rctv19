const {test}=require('node:test');
const assert=require('node:assert/strict');
const nunjucks=require('nunjucks');
const env=new nunjucks.Environment(new nunjucks.FileSystemLoader('src/_includes'),{autoescape:true});
env.addFilter('validPublisher',v=>/^ca-pub-\d{16}$/.test(v||''));
env.addFilter('validSlot',v=>/^\d+$/.test(v||''));
env.addFilter('optimizedImage',v=>v);
test('ad slots require enabled serving, page eligibility and a valid slot',()=>{
  const data={slotName:'test',adsEligible:true,ads:{adsenseEnabled:true,adsensePublisherId:'ca-pub-3245500092050206',test:{type:'adsense',enabled:true,slot:'1234567890'}}};
  const render=d=>env.render('components/ad-slot.njk',d);
  assert.match(render(data),/<ins class="adsbygoogle"/);
  assert.doesNotMatch(render({...data,adsEligible:false}),/<ins/);
  assert.doesNotMatch(render({...data,noindex:true}),/<ins/);
  assert.doesNotMatch(render({...data,ads:{...data.ads,adsenseEnabled:false}}),/<ins/);
  assert.doesNotMatch(render({...data,ads:{...data.ads,test:{...data.ads.test,slot:'PLACEHOLDER'}}}),/<ins/);
});
