import {test} from 'node:test';import assert from 'node:assert/strict';
import {selectContact,recoveryPosition} from '../dist/tactics.js';
import {CONFIG as CFG} from '../dist/config.js';
import {readFileSync} from 'node:fs';import vm from 'node:vm';
const samples=[{x:.68,y:1.2,z:4.4,vx:0,vy:-1,vz:12,time:1.5,bounces:0,landing:null},{x:.68,y:1.1,z:6,vx:0,vy:1,vz:8,time:2.5,bounces:1,landing:{x:.68,z:4,time:1.7}}];
const options={position:{x:0,z:5},end:1,speed:6.5,allowAir:true};
test('net mode prioritizes volley, baseline mode prioritizes reachable bounced contact',()=>{
 assert.equal(selectContact(samples,{...options,preference:'net'}).kind,'volley');
 assert.equal(selectContact(samples,{...options,preference:'baseline'}).ball.bounces,1);
 assert.equal(selectContact(samples,{...options,preference:'net',allowAir:false}).ball.bounces,1);
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
 const ctx={started:true,paused:false,phase:'flight',lastHitter:1,humanPositionMode:'baseline',recoveryTargets:[null,null],recoveryDelay:[1,1],ends:[1,-1],human,plan:null,flightSamples:samples,elapsed:.5,stamina:[100,100],runSpeed:()=>6.5,isServe:false,selectContact,recoveryPosition,updateContactGuide(){},dirty:false,say(){},ui(){},$:()=>button};
 vm.createContext(ctx);vm.runInContext(handler,ctx);button.onclick();
 assert.equal(ctx.humanPositionMode,'net');assert.equal(ctx.plan.kind,'volley');assert.equal(ctx.plan.time,1.5);assert.equal(ctx.elapsed,.5);assert.equal(ctx.recoveryTargets[0].z,CFG.tactics.attackDepth);
 button.onclick();assert.equal(ctx.humanPositionMode,'baseline');assert.equal(ctx.plan.ball.bounces,1);assert.equal(ctx.recoveryTargets[0].z,CFG.tactics.baselineDepth);
 ctx.paused=true;button.onclick();assert.equal(ctx.humanPositionMode,'baseline');
});
