import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {viewportLayout,fitCourtCamera,courtBounds,gesturePlacement,gesturePowerPlacement,directionShot} from '../dist/viewport.js';
for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390],[667,375],[1024,1366],[1280,720]]){
 test(`court, baseline players and controls fit ${width}×${height}`,()=>{
  const safe={top:height>width?44:0,bottom:height>width?34:21,left:height<width?44:0,right:height<width?44:0};
  const layout=viewportLayout(width,height,safe,true),camera=new THREE.PerspectiveCamera(43,1,.1,220);
  for(const end of [1,-1]){fitCourtCamera(camera,layout,end);for(const corner of courtBounds){const p=corner.clone().project(camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2;assert.ok(x>=layout.rect.left-.1&&x<=layout.rect.right+.1,`x=${x}`);assert.ok(y>=layout.rect.top-.1&&y<=layout.rect.bottom+.1,`y=${y}`)}}
  for(const kind of ['serve','rally'])for(const [x,y] of [[0,0],[width,height],[width/2,height/2]]){
   const p=gesturePlacement(layout,x,y,kind);assert.ok(p.left>=safe.left);assert.ok(p.top>=safe.top);assert.ok(p.left+p.width<=width-safe.right);assert.ok(p.top+p.height<=height-safe.bottom);assert.ok(98*p.scale>=44);
   const power=gesturePowerPlacement(layout,{x,y});
   assert.ok(power.left>=safe.left&&power.left+power.width<=width-safe.right);
   assert.ok(power.top>=safe.top&&power.top+power.height<=height-safe.bottom);
  }
 });
}
test('short thumb drags select all three shots without needing space below the finger',()=>{
 assert.equal(directionShot(0,-30),'top');assert.equal(directionShot(-30,0),'flat');assert.equal(directionShot(30,0),'slice');assert.equal(directionShot(5,-5),null);
});
test('phone and desktop share camera inclination and central gesture anchors',()=>{
 const mobile=viewportLayout(390,844,{},true),desktop=viewportLayout(1280,720,{},false);
 const ratios=[mobile,desktop].map(layout=>{const camera=new THREE.PerspectiveCamera(43,1,.1,220);fitCourtCamera(camera,layout);return camera.position.y/camera.position.z});
 assert.ok(Math.abs(ratios[0]-ratios[1])<1e-10);
 const p=gesturePlacement(desktop,640,360,'rally');
 assert.equal(p.left+145*p.scale,640);assert.equal(p.top+140*p.scale,360);
 const power=gesturePowerPlacement(desktop,{x:800,y:300});assert.equal(power.left,808);
 const nearby=gesturePowerPlacement(mobile,{x:195,y:350},gesturePlacement(mobile,195,350,'rally'));
 const menu=gesturePlacement(mobile,195,350,'rally');
 assert.ok(nearby.left>=menu.left+menu.width||nearby.left+nearby.width<=menu.left||nearby.top>=menu.top+menu.height||nearby.top+nearby.height<=menu.top);
});
