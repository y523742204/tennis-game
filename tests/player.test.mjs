import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createPlayer,beginStroke,updatePlayer} from '../dist/player.js';

const player=()=>createPlayer(new THREE.Scene(),'#fff',0,'#333');
for(const backhand of [false,true])for(const type of ['flat','top','slice','volley','smash']){
  test(`${type} ${backhand?'backhand':'forehand'} stays continuous and contacts once`,()=>{
    const p=player();
    for(let i=0;i<60;i++)updatePlayer(p,1/60);
    beginStroke(p,{type,backhand});
    let hits=0,previous=p.userData.rig.rightArm.shoulder.rotation.toArray().slice(0,3);
    for(let i=0;i<120;i++){
      if(updatePlayer(p,1/60)){hits++;assert.ok(Math.abs((i+1)/60-1.05*.42)<1/60)}
      const current=p.userData.rig.rightArm.shoulder.rotation.toArray().slice(0,3);
      current.forEach((v,j)=>{assert.ok(Number.isFinite(v));assert.ok(Math.abs(v-previous[j])<.3)});
      previous=current;
    }
    assert.equal(hits,1);
    assert.equal(p.userData.rig.swing,null);
    assert.ok(Math.abs(previous[0]-1.05)<.01);
  });
}
test('pause freezes running joints and stroke timing; stopping settles smoothly',()=>{
  const p=player(),r=p.userData.rig;
  for(let i=0;i<30;i++){p.position.x+=.06;updatePlayer(p,1/60,{moving:true})}
  beginStroke(p);
  const before=r.leftLeg.hip.rotation.toArray();
  updatePlayer(p,.5,{paused:true,moving:true});
  assert.deepEqual(r.leftLeg.hip.rotation.toArray(),before);
  assert.equal(r.swing.time,0);
  for(let i=0;i<180;i++)updatePlayer(p,1/60);
  assert.ok(r.velocity.length()<.001);
  assert.ok(Math.abs(r.leftLeg.foot.x+.16)<.001);
  assert.ok(Math.abs(r.leftLeg.foot.z)<.001);
});
