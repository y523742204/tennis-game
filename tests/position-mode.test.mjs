import {test} from 'node:test';import assert from 'node:assert/strict';
import {selectContact,recoveryPosition} from '../dist/tactics.js';
import {CONFIG as CFG} from '../dist/config.js';
import {solveShot,freeFlight} from '../dist/shot.js';
import {readFileSync} from 'node:fs';import vm from 'node:vm';
const samples=[{x:.68,y:1.2,z:4.4,vx:0,vy:-1,vz:12,time:1.5,bounces:0,landing:null},{x:.68,y:1.1,z:6,vx:0,vy:1,vz:8,time:2.5,bounces:1,landing:{x:.68,z:4,time:1.7}}];
const options={position:{x:0,z:5},end:1,speed:6.5,allowAir:true};
test('net mode prioritizes volley, baseline mode prioritizes reachable bounced contact',()=>{
 assert.equal(selectContact(samples,{...options,preference:'net'}).kind,'volley');
 assert.equal(selectContact(samples,{...options,preference:'baseline'}).ball.bounces,1);
 assert.equal(selectContact(samples,{...options,preference:'net',allowAir:false}).ball.bounces,1);
});
test('active net mode intercepts normal fast drives and higher soft balls without teleporting',()=>{
 const drive={...samples[0],z:6.5,y:1.5,vz:30,time:1.5};
 assert.equal(selectContact([drive],{...options,preference:'auto'}),null);
 assert.equal(selectContact([drive],{...options,preference:'net'}).kind,'volley');
 const lob={...drive,z:4.4,y:3.6,vz:10,vy:-2};
 assert.equal(selectContact([lob],{...options,preference:'net'}).kind,'smash');
 assert.equal(selectContact([{...drive,time:.01}],{...options,preference:'net'}),null);
 assert.equal(selectContact([drive],{...options,preference:'net',allowAir:false}),null);
});
test('standard baseline rally flight offers a real airborne contact to a net player',()=>{
 const origin={x:0,y:1.1,z:-11},shot=solveShot(origin,{x:1,z:10},'flat',65),flight=[];
 for(let time=.05;time<shot.time;time+=.015){const f=freeFlight(origin,shot.v,shot.spin,time);flight.push({...f.position,vx:f.velocity.x,vy:f.velocity.y,vz:f.velocity.z,time,bounces:0,landing:null})}
 const contact=selectContact(flight,{...options,position:{x:0,z:CFG.tactics.attackDepth},preference:'net'});
 assert.ok(contact&&['volley','smash'].includes(contact.kind));assert.ok(contact.reachable);assert.equal(contact.ball.bounces,0);
});
test('net and baseline recovery depths mirror correctly on end changes',()=>{
 for(const end of [1,-1])for(const mode of ['net','baseline']){
  const p=recoveryPosition({end,mode,strikePosition:{x:0,z:10*end}});
  assert.equal(p.z,end*(mode==='net'?CFG.tactics.attackDepth:CFG.tactics.baselineDepth));
 }
});
const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf("$('positionMode').onclick="),source.indexOf("$('courtMenu').onclick="));
test('live toggle replans incoming ball without resetting elapsed time or current choice',()=>{
 const button={},human={position:{x:0,z:5},userData:{rig:{swing:{}}}};
 const ctx={CFG,energy:{spend(){}},netRushRemaining:0,started:true,paused:false,phase:'flight',lastHitter:1,humanPositionMode:'baseline',recoveryTargets:[null,null],recoveryDelay:[1,1],ends:[1,-1],human,plan:null,flightSamples:samples,elapsed:.5,stamina:[100,100],runSpeed:()=>6.5,isServe:false,selectContact,recoveryPosition,updateContactGuide(){},dirty:false,say(){},ui(){},$:()=>button};
 vm.createContext(ctx);vm.runInContext(handler,ctx);button.onclick();
 assert.equal(ctx.humanPositionMode,'net');assert.equal(ctx.plan.kind,'volley');assert.equal(ctx.plan.time,1.5);assert.equal(ctx.elapsed,.5);assert.equal(ctx.recoveryTargets[0].z,CFG.tactics.attackDepth);
 button.onclick();assert.equal(ctx.humanPositionMode,'baseline');assert.equal(ctx.plan.ball.bounces,1);assert.equal(ctx.recoveryTargets[0].z,CFG.tactics.baselineDepth);
 ctx.paused=true;button.onclick();assert.equal(ctx.humanPositionMode,'baseline');
});
test('entering net mode charges once, retreat and paused clicks do not charge',()=>{
 const button={},ctx={CFG,netRushRemaining:0,started:true,paused:false,phase:'flight',lastHitter:0,humanPositionMode:'baseline',recoveryTargets:[null,null],recoveryDelay:[0,0],ends:[1,-1],human:{position:{x:0,z:11}},plan:null,recoveryPosition,say(){},ui(){},$:()=>button};
 let spent=0;ctx.energy={spend(who,cost){assert.equal(who,0);spent+=cost}};
 vm.createContext(ctx);vm.runInContext(handler,ctx);button.onclick();assert.equal(spent,CFG.stamina.netRushCost);assert.equal(ctx.netRushRemaining,CFG.movement.netRushDistance);
 button.onclick();assert.equal(spent,CFG.stamina.netRushCost);assert.equal(ctx.netRushRemaining,0);
 ctx.paused=true;button.onclick();assert.equal(spent,CFG.stamina.netRushCost);
 ctx.paused=false;button.onclick();assert.equal(spent,CFG.stamina.netRushCost*2);
});
