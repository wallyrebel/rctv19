import test from 'node:test';import assert from 'node:assert/strict';
import {panelFor,cameraFor,CAMERAS,ROTATION} from '../src/assets/weather/cameras.mjs';
test('active warnings do not starve camera, forecast, news or track rotation',()=>{
 const sequence=Array.from({length:ROTATION.length},(_,index)=>panelFor({view:'rotating',index,hasWarnings:true}));
 assert.deepEqual(sequence,['cameras','warning','forecast','cameras','news','track']);
 assert.equal(panelFor({view:'fixed',hasWarnings:true}),'warning');
 assert.equal(panelFor({view:'fixed',hasWarnings:true,cameraOverride:true}),'cameras');
});
test('camera slots cycle through all approved coastal views and reject unknown selections',()=>{
 assert.deepEqual([0,3,6,9].map(i=>cameraFor(i).id),['050303','050204','052618','050303']);
 assert.equal(cameraFor(0,'https://untrusted.example').id,'050303');
 assert.equal(new Set(CAMERAS.map(c=>new URL(c.url).hostname)).size,2);
 assert.ok(CAMERAS.every(c=>new URL(c.url).protocol==='https:'&&new URL(c.url).hostname.endsWith('.mdottraffic.com')));
});
