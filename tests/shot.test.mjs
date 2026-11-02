import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../dist/vendor/cannon-es.js';
import {CONFIG as cfg} from '../dist/config.js';
import {solveShot,speedKmh,desiredSpeedKmh,freeFlight} from '../dist/shot.js';
import {aerodynamicForce,PHYSICS_STEP} from '../dist/flight.js';
import {selectContact} from '../dist/tactics.js';
const origin={x:2,y:cfg.shot.serveContactHeight,z:12.25},target={x:-2,z:cfg.shot.serveTargetDepth*-1};
test('neutral flat serve is 180 km/h and Perfect is 225, with net clearance',()=>{
 for(const [perfect,expected] of [[false,180],[true,225]]){
  const shot=solveShot(origin,target,'flat',65,perfect,{x:0,y:0});
  assert.ok(Math.abs(shot.speedKmh-expected)<3,JSON.stringify(shot));
  assert.ok(shot.netHeight>=cfg.shot.netTop+cfg.physics.ballRadius);
  assert.ok(Math.hypot(shot.landing.x-target.x,shot.landing.z-target.z)<.1);
 }
});
test('baseline flat return is 120 km/h and Perfect is 150',()=>{
 for(const [perfect,expected] of [[false,120],[true,150]]){
  const shot=solveShot({x:0,y:1.1,z:11},{x:0,z:-10},'flat',65,perfect);
  assert.ok(Math.abs(shot.speedKmh-expected)<3,JSON.stringify(shot));
  assert.ok(shot.netHeight>=cfg.shot.netTop+cfg.physics.ballRadius);
 }
});
test('fatigue and spin reduce pace; Perfect still boosts the fatigued shot',()=>{
 assert.equal(desiredSpeedKmh('flat',65),120);
 assert.equal(desiredSpeedKmh('flat',65,true),150);
 assert.equal(desiredSpeedKmh('flat',65,false,null,0),84);
 assert.equal(desiredSpeedKmh('flat',65,true,null,0),105);
 assert.ok(desiredSpeedKmh('top',65,false,{x:0,y:1})<180);
 assert.equal(speedKmh({x:30,y:0,z:40}),180);
});
test('free-flight solver matches live cannon-es, including drag and mixed spin',()=>{
 const shot=solveShot(origin,target,'top',65,false,{x:.5,y:.5});
 const w=new C.World({gravity:new C.Vec3(0,-cfg.physics.gravity,0)});
 const b=new C.Body({mass:cfg.physics.ballMass,shape:new C.Sphere(cfg.physics.ballRadius),linearDamping:0,angularDamping:cfg.physics.angularDamping});
 b.position.set(origin.x,origin.y,origin.z);b.velocity.set(shot.v.x,shot.v.y,shot.v.z);b.angularVelocity.set(shot.spin.x,shot.spin.y,shot.spin.z);w.addBody(b);
 for(let i=0;i<Math.round(shot.time/PHYSICS_STEP);i++){const f=aerodynamicForce(b.velocity,b.angularVelocity);b.applyForce(new C.Vec3(f.x,f.y,f.z));w.step(PHYSICS_STEP)}
 const simulated=freeFlight(origin,shot.v,shot.spin,shot.time);
 assert.ok(b.position.distanceTo(new C.Vec3(simulated.position.x,simulated.position.y,simulated.position.z))<1e-6);
});
test('short low returns prioritise net clearance and report their actual slower speed',()=>{
 const shot=solveShot({x:0,y:.6,z:5},{x:0,z:-4},'flat',65,true);
 assert.ok(shot.netHeight>=cfg.shot.netTop+cfg.physics.ballRadius);
 assert.ok(shot.speedKmh<150);assert.equal(shot.speedKmh,speedKmh(shot.v));
 assert.ok(Math.hypot(shot.landing.x,shot.landing.z+4)<.1);
});
test('fast legal serves bounce and can be received near the baseline at either end',()=>{
 for(const end of [1,-1])for(const perfect of [false,true]){
  const start={x:2*end,y:cfg.shot.serveContactHeight,z:12.25*end},aim={x:-2*end,z:-cfg.shot.serveTargetDepth*end};
  const shot=solveShot(start,aim,'flat',65,perfect,{x:0,y:0});
  const w=new C.World({gravity:new C.Vec3(0,-cfg.physics.gravity,0)}),felt=new C.Material(),grass=new C.Material(),netMat=new C.Material();
  w.solver.iterations=cfg.physics.solverIterations;
  w.addContactMaterial(new C.ContactMaterial(felt,grass,{friction:cfg.physics.grassFriction,restitution:cfg.physics.grassRestitution}));
  w.addContactMaterial(new C.ContactMaterial(felt,netMat,{friction:cfg.physics.netFriction,restitution:cfg.physics.netRestitution}));
  const floor=new C.Body({mass:0,material:grass,shape:new C.Plane()});floor.quaternion.setFromEuler(-Math.PI/2,0,0);floor.position.y=-.06;w.addBody(floor);
  const net=new C.Body({mass:0,material:netMat,shape:new C.Box(new C.Vec3(6.5,.55,.035)),position:new C.Vec3(0,.5,0)});w.addBody(net);
  const b=new C.Body({mass:cfg.physics.ballMass,material:felt,shape:new C.Sphere(cfg.physics.ballRadius),linearDamping:0,angularDamping:cfg.physics.angularDamping});
  b.position.set(start.x,start.y,start.z);b.velocity.set(shot.v.x,shot.v.y,shot.v.z);b.angularVelocity.set(shot.spin.x,shot.spin.y,shot.spin.z);w.addBody(b);
  let bounces=0,landing=null,netHit=false,time=0;const samples=[];
  b.addEventListener('collide',e=>{if(e.body===net)netHit=true;if(e.body===floor){bounces++;landing??={x:b.position.x,z:b.position.z,time}}});
  for(let i=1;i<600&&bounces<2;i++){
   time=i*PHYSICS_STEP;const f=aerodynamicForce(b.velocity,b.angularVelocity);b.applyForce(new C.Vec3(f.x,f.y,f.z));w.step(PHYSICS_STEP);
   if(bounces===1)samples.push({...b.position,vx:b.velocity.x,vy:b.velocity.y,vz:b.velocity.z,time,bounces,landing});
  }
  assert.equal(netHit,false);assert.ok(landing&&Math.abs(landing.z)<=cfg.court.serviceDepth+cfg.physics.ballRadius);
  const contact=selectContact(samples,{position:{x:-2.2*end,z:-cfg.shot.receiverDepth*end},end:-end,speed:cfg.movement.humanSpeed,stamina:100});
  assert.ok(contact,'serve should have a selectable return');
  assert.ok(Math.abs(contact.z)>=9,`return position too close to net: ${contact.z}`);
  assert.ok(contact.reachable,`return unreachable: ${contact.setup}`);
 }
});
