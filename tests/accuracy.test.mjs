import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG as cfg} from '../dist/config.js';
import {serveVelocityError,netShotTargetError} from '../dist/accuracy.js';
import {solveShot,speedKmh} from '../dist/shot.js';
import {fatigueTarget,staminaEffects} from '../dist/stamina.js';
import {validServiceLanding} from '../dist/rules.js';
import {aerodynamicForce,PHYSICS_STEP} from '../dist/flight.js';
const seeded=()=>{let n=123456789;return ()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296}};
test('extra angle error affects only flat first serves and preserves physical speed',()=>{
 const v={x:2,y:-6,z:-49};
 for(const options of [{serving:false},{serving:true,attempt:2},{serving:true,type:'top'},{serving:true,pad:{x:0,y:.5}}])assert.deepEqual(serveVelocityError(v,options,()=>0),v);
 const miss=serveVelocityError(v,{serving:true},()=>0);assert.notDeepEqual(miss,v);
 assert.ok(Math.abs(speedKmh(miss)-speedKmh(v))<1e-9);
 const perfect=serveVelocityError(v,{serving:true,perfect:true},()=>0);
 assert.ok(Math.abs(perfect.y-v.y)<Math.abs(miss.y-v.y));
});
function landing(origin,velocity,spin){
 const p={...origin},v={...velocity},w={...spin},dt=PHYSICS_STEP;
 let net=false;
 for(let i=0;i<720;i++){
  const before={...p},f=aerodynamicForce(v,w);
  v.x+=f.x/cfg.physics.ballMass*dt;v.y+=(f.y/cfg.physics.ballMass-cfg.physics.gravity)*dt;v.z+=f.z/cfg.physics.ballMass*dt;
  for(const axis of ['x','y','z']){p[axis]+=v[axis]*dt;w[axis]*=Math.pow(1-cfg.physics.angularDamping,dt)}
  if(before.z*p.z<=0){const y=before.y+(p.y-before.y)*(-before.z)/(p.z-before.z);if(y<cfg.shot.netTop+cfg.physics.ballRadius)net=true}
  if(p.y<=cfg.shot.landingHeight){const f=(before.y-cfg.shot.landingHeight)/(before.y-p.y);return {x:before.x+(p.x-before.x)*f,z:before.z+(p.z-before.z)*f,net}}
 }
 throw Error('shot never landed');
}
test('first-serve accuracy produces actual net and long faults rather than forced score failures',t=>{
 const origin={x:2,y:cfg.shot.serveContactHeight,z:cfg.court.halfLength+.25};
 const shot=solveShot(origin,{x:-2,z:-6},'flat',65,false,{x:0,y:0});
 const random=seeded();let good=0,net=0,long=0;
 for(let i=0;i<512;i++){
  const v=serveVelocityError(shot.v,{serving:true,attempt:1,power:65},random),p=landing(origin,v,shot.spin);
  if(p.net)net++;else if(validServiceLanding(p.x,p.z,1,0))good++;else long++;
 }
 t.diagnostic(`flat first serve: ${(good/512*100).toFixed(1)}% in, ${net} net, ${long} out`);
 assert.ok(good/512>.3&&good/512<.9);assert.ok(net>0&&long>0);
 const second=landing(origin,serveVelocityError(shot.v,{serving:true,attempt:2},random),shot.spin);
 assert.equal(second.net,false);assert.ok(validServiceLanding(second.x,second.z,1,0));
});
test('low stamina produces substantially more out balls with seeded target samples',t=>{
 function faults(energy){const random=seeded();let out=0;for(let i=0;i<2000;i++){const p=fatigueTarget({x:3,z:-10.5},energy,random);if(Math.abs(p.x)>cfg.court.halfWidth+cfg.physics.ballRadius||Math.abs(p.z)>cfg.court.halfLength+cfg.physics.ballRadius)out++}return out/2000}
 const fresh=faults(100),middle=faults(40),low=faults(15);
 t.diagnostic(`target error out rate: full ${fresh}, stamina40 ${middle}, stamina15 ${low}`);
 assert.equal(fresh,0);assert.ok(low>.25);assert.ok(low>middle+.1);
 assert.ok(staminaEffects(40).scatter>1);assert.ok(staminaEffects(15).scatter>2.9);
});
test('net-shot target instability grows with incoming pace and leaves groundstrokes unchanged',()=>{
 const target={x:0,z:-8},random=()=>1;
 assert.deepEqual(netShotTargetError(target,'flat',{x:0,y:0,z:50},random),target);
 assert.deepEqual(netShotTargetError(target,'volley',{x:0,y:0,z:20},random),target);
 const medium=netShotTargetError(target,'volley',{x:0,y:0,z:30},random);
 const fast=netShotTargetError(target,'smash',{x:0,y:0,z:50},random);
 const deviation=point=>Math.hypot(point.x-target.x,point.z-target.z);
 assert.ok(deviation(medium)>0);assert.ok(deviation(fast)>deviation(medium));
 assert.ok(deviation(fast)<=cfg.shot.netPaceScatterMax+.0001);
});
