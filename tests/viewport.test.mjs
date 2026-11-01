import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {viewportLayout,fitCourtCamera,courtBounds,gesturePlacement,directionShot} from '../dist/viewport.js';
for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390],[667,375],[1024,1366],[1280,720]]){
 test(`court, baseline players and controls fit ${width}×${height}`,()=>{
  const safe={top:height>width?44:0,bottom:height>width?34:21,left:height<width?44:0,right:height<width?44:0};
  const layout=viewportLayout(width,height,safe,true),camera=new THREE.PerspectiveCamera(43,1,.1,220);
  for(const end of [1,-1]){fitCourtCamera(camera,layout,end);for(const corner of courtBounds){const p=corner.clone().project(camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2;assert.ok(x>=layout.rect.left-.1&&x<=layout.rect.right+.1,`x=${x}`);assert.ok(y>=layout.rect.top-.1&&y<=layout.rect.bottom+.1,`y=${y}`)}}
  for(const kind of ['serve','rally'])for(const [x,y] of [[0,0],[width,height],[width/2,height/2]]){
   const p=gesturePlacement(layout,x,y,kind);assert.ok(p.left>=safe.left);assert.ok(p.top>=safe.top);assert.ok(p.left+p.width<=width-safe.right-60);assert.ok(p.top+p.height<=height-safe.bottom);assert.ok(98*p.scale>=44);
  }
 });
}
test('short thumb drags select all three shots without needing space below the finger',()=>{
 assert.equal(directionShot(0,-30),'top');assert.equal(directionShot(-30,0),'flat');assert.equal(directionShot(30,0),'slice');assert.equal(directionShot(5,-5),null);
});
