import {test} from 'node:test';
import assert from 'node:assert/strict';
import {strokePose,sampleFrames,splitStepPose,serveTossHeight} from '../dist/stroke-motion.js';
import {CONFIG as CFG,strokePoses} from '../dist/config.js';
import {createPlayer,beginStroke,updatePlayer} from '../dist/player.js';
import * as THREE from '../dist/vendor/three.module.js';
test('continuous stroke interpolation carries speed through contact without angular overshoot',()=>{
 const frames=[[0,{angle:0}],[.3,{angle:.3}],[.5,{angle:1}],[1,{angle:1.5}]];
 assert.ok((sampleFrames(frames,.5001).angle-sampleFrames(frames,.4999).angle)/.0002>1);
 for(let i=0;i<=100;i++){const p=sampleFrames(frames,i/100);assert.ok(p.angle>=0&&p.angle<=1.5)}
});
test('groundstrokes rotate hips before shoulders and transfer weight forward',()=>{
 for(const backhand of [false,true]){
  const side=backhand?-1:1,{coil,drive,contactPose,finish}=strokePoses('top',backhand);
  assert.ok(drive.hipYaw*side>0&&drive.yaw*side<0);
  assert.ok(coil.transfer<0&&contactPose.transfer>0);
  assert.ok(finish.right[0]>contactPose.right[0]);
 }
});
test('serve bends then extends the elbow and finishes across the body',()=>{
 const a=CFG.animation,drop=strokePose('flat',false,true,a.serveDrop),contact=strokePose('flat',false,true,a.serveContact),finish=strokePose('flat',false,true,a.serveFinish);
 assert.ok(drop.elbowR>1.5&&contact.elbowR<.2);assert.ok(drop.bend>contact.bend);assert.ok(contact.lift>0);assert.ok(finish.right[2]<0);
});
test('racket contact is in front on the correct side for both court ends',()=>{
 for(const end of [1,-1])for(const backhand of [false,true]){
  const p=createPlayer(new THREE.Scene(),'#fff',0,'#333');beginStroke(p,{backhand});
  for(let i=0;i<Math.ceil(CFG.animation.strokeDuration*CFG.animation.contact*240);i++)updatePlayer(p,1/240,{end});
  p.updateMatrixWorld(true);const head=new THREE.Vector3();p.userData.rig.strings.getWorldPosition(head);
  assert.ok(head.z*end<-.3,`contact must be in front: ${head.toArray()}`);
  assert.ok(head.x*end*(backhand?-1:1)>.15,`correct wing: ${head.toArray()}`);
 }
});
test('split step rises then lands into bent knees and returns to neutral',()=>{
 const a=CFG.animation,air=splitStepPose(a.splitDuration*.3),landing=splitStepPose(a.splitDuration*.7),end=splitStepPose(a.splitDuration);
 assert.ok(air.lift>.06);assert.ok(landing.lift<.001&&landing.bend>.2);
 assert.ok(end.lift<1e-8&&end.bend<1e-8&&end.width<1e-8);
 const p=createPlayer(new THREE.Scene(),'#fff',0,'#333');p.userData.rig.splitStep=0;
 updatePlayer(p,.1,{paused:true});assert.equal(p.userData.rig.splitStep,0);
 for(let i=0;i<100;i++)updatePlayer(p,1/120);
 assert.equal(p.userData.rig.splitStep,null);
});
test('slice has a high to low swing while topspin follows upward',()=>{
 for(const backhand of [false,true]){
  const s=strokePoses('slice',backhand),top=strokePoses('top',backhand);
  assert.ok(s.coil.right[0]>s.contactPose.right[0]);assert.ok(s.finish.right[0]<s.contactPose.right[0]);
  assert.ok(top.finish.right[0]>top.contactPose.right[0]);assert.ok(s.contactPose.wrist[0]>0);
 }
});
test('serve toss rises above contact then descends to the real launch height',()=>{
 const a=CFG.animation;assert.equal(serveTossHeight(0),1.3);
 assert.ok(serveTossHeight(a.serveTossPeak)>CFG.shot.serveContactHeight);
 assert.ok(serveTossHeight(a.serveContact-.05)>serveTossHeight(a.serveContact));
 assert.equal(serveTossHeight(a.serveContact),CFG.shot.serveContactHeight);
});
