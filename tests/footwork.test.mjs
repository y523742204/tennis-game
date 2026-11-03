import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseStance,footTargets,legAngles} from '../dist/footwork.js';
import {createPlayer,updatePlayer,beginStroke} from '../dist/player.js';
import * as THREE from '../dist/vendor/three.module.js';
import {CONFIG as CFG} from '../dist/config.js';
test('closed feet turn sequentially while lifted and hold through contact despite speed changes',()=>{
 for(const backhand of [false,true]){
  const sample=(progress,speed=0)=>footTargets({stance:'closed',progress,backhand,speed,vx:speed,amount:.5});
  let previous=sample(0);
  for(let i=1;i<=200;i++){
   const next=sample(i/200),changed=next.map((f,j)=>Math.abs(f.yaw-previous[j].yaw)>1e-6);
   assert.ok(!(changed[0]&&changed[1]),'both feet must not twist together');
   next.forEach((f,j)=>{if(changed[j])assert.ok(f.lift>1e-6||previous[j].lift>1e-6)});previous=next;
  }
  const set=sample(CFG.animation.coil),hit=sample(CFG.animation.contact,5),follow=sample(CFG.animation.finish,2);
  for(let j=0;j<2;j++){assert.equal(set[j].yaw,hit[j].yaw);assert.equal(hit[j].yaw,follow[j].yaw);assert.equal(set[j].z,hit[j].z)}
 }
});
test('stance choice uses shot and lateral pressure',()=>{
 assert.equal(chooseStance(), 'open');assert.equal(chooseStance({backhand:true}),'closed');
 assert.equal(chooseStance({type:'slice'}),'closed');assert.equal(chooseStance({backhand:true,lateral:3}),'open');
 assert.equal(chooseStance({serve:true,lateral:3}),'closed');
});
test('open stance has side-by-side feet; closed stance staggers and mirrors wings',()=>{
 const open=footTargets({amount:1,stance:'open'}),closed=footTargets({amount:1,stance:'closed'}),back=footTargets({amount:1,stance:'closed',backhand:true});
 assert.equal(open[0].z,open[1].z);assert.ok(open[1].x-open[0].x>closed[1].x-closed[0].x);
 assert.ok(closed[0].z<closed[1].z);assert.equal(closed[0].z,-back[0].z);
});
test('shuffle feet do not cross and support foot remains down',()=>{
 for(let i=0;i<100;i++){
  const feet=footTargets({phase:i/100*Math.PI*2,speed:5,vx:5,vz:0});
  assert.ok(feet[0].x<feet[1].x);
  for(const f of feet)if(f.planted)assert.equal(f.lift,0);
 }
});
test('leg solver remains finite and ankle compensates pitch',()=>{
 for(const v of [[0,-.78,0],[.2,-.65,.2],[-.3,-.4,-.3],[0,0,0]]){
  const a=legAngles(...v);Object.values(a).forEach(x=>assert.ok(Number.isFinite(x)));
  assert.ok(a.knee<=0);assert.ok(Math.abs(a.hip+a.knee+a.ankle)<1e-10);
 }
});
test('actual running advances gait, stopping settles feet and stroke records stance',()=>{
 const p=createPlayer(new THREE.Scene(),'#fff',0,'#333'),r=p.userData.rig;
 for(let i=0;i<60;i++){p.position.x+=.04;updatePlayer(p,1/60,{moving:true})}
 assert.ok(r.gait>Math.PI*2);beginStroke(p,{backhand:true});assert.equal(r.swing.stance,'open');
 for(let i=0;i<240;i++)updatePlayer(p,1/60);
 assert.ok(Math.abs(r.leftLeg.foot.z)<.001);assert.ok(Math.abs(r.leftLeg.foot.y-.06)<.001);
 beginStroke(p,{backhand:true});assert.equal(r.swing.stance,'closed');
 const phase=r.gait;p.position.z+=10;updatePlayer(p,1/60,{moving:true});assert.equal(r.gait,phase);
});
