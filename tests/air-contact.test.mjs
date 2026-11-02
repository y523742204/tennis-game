import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectContact,selectAirContact} from '../dist/tactics.js';
import {solveShot,speedKmh,freeFlight} from '../dist/shot.js';
import {CONFIG as CFG} from '../dist/config.js';
const options={position:{x:0,z:5},end:1,speed:6.5,stamina:100,allowAir:true};
const ball={x:.68,y:1.4,z:4.4,vx:0,vy:-1,vz:12,time:1,bounces:0};
test('reachable soft ball is intercepted before bouncing on either end',()=>{
 for(const end of [1,-1]){
  const plan=selectContact([{...ball,x:ball.x*end,z:ball.z*end,vz:ball.vz*end}],{...options,end,position:{x:0,z:5*end}});
  assert.equal(plan.kind,'volley');assert.equal(plan.ball.bounces,0);assert.equal(plan.reachable,true);
 }
});
test('descending high ball permits overhead; rising or unreachable lob does not',()=>{
 assert.equal(selectAirContact([{...ball,y:3}],options).kind,'smash');
 assert.equal(selectAirContact([{...ball,y:3,vy:5}],options),null);
 assert.equal(selectAirContact([{...ball,y:3,time:.05}],options),null);
 assert.equal(selectAirContact([{...ball,y:4}],options),null);
});
test('cannot volley serve, opponent-side ball, deep low ball or fast drive',()=>{
 assert.equal(selectContact([ball],{...options,allowAir:false}),null);
 for(const change of [{z:-2},{z:9},{vz:40},{bounces:1}])assert.equal(selectAirContact([{...ball,...change}],options),null);
});
test('volley and overhead generate finite legal trajectories and distinct pace',()=>{
 for(const [type,y]of [['volley',1.4],['smash',3]]){
  const origin={x:0,y,z:4.4},target={x:1,z:-9};
  const shot=solveShot(origin,target,type,65);
  assert.ok(Number.isFinite(speedKmh(shot.v)));
  assert.ok(shot.netHeight>=CFG.shot.netTop+CFG.physics.ballRadius);
  assert.ok(Math.abs(shot.landing.x-target.x)<.15&&Math.abs(shot.landing.z-target.z)<.15);
  if(type==='smash')assert.ok(speedKmh(shot.v)>140);
 }
});
test('strong sidespin creates a larger real lateral curve at the same initial velocity',()=>{
 const origin={x:0,y:3.5,z:12},v={x:0,y:0,z:-45};
 const old=freeFlight(origin,v,{x:0,y:85,z:0},.5);
 const strong=freeFlight(origin,v,{x:0,y:CFG.physics.serveSideSpin,z:0},.5);
 assert.ok(Math.abs(strong.position.x)>Math.abs(old.position.x)*1.8);
});
