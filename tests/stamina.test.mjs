import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Stamina,staminaEffects,fatigueTarget,staminaDisplay} from '../dist/stamina.js';
import {CONFIG} from '../dist/config.js';
test('time recovery is frame independent and capped',()=>{
 const a=new Stamina(),b=new Stamina();a.spend(0,50);b.spend(0,50);
 a.recover(5);for(let i=0;i<50;i++)b.recover(.1);
 assert.ok(Math.abs(a.values[0]-b.values[0])<1e-9);assert.equal(a.values[0],60);
 a.recover(100);assert.equal(a.values[0],100);
});
test('exhaustion is deferred, counted once per point and resets each game',()=>{
 const e=new Stamina();e.spend(0,110);assert.equal(e.values[0],0);assert.equal(e.caps[0],100);
 e.recover(1);e.spend(0,2);e.finishPoint();
 assert.deepEqual(e.caps,[90,100]);assert.deepEqual(e.values,[90,100]);
 e.spend(0,20);e.finishPoint();assert.equal(e.values[0],90);
 e.spend(0,100);e.finishPoint();assert.equal(e.caps[0],81);
 e.spend(1,100);e.finishPoint(true);assert.deepEqual(e.caps,[100,100]);assert.deepEqual(e.values,[100,100]);
});
test('low energy slows movement and shots and increases bounded target error',()=>{
 const full=staminaEffects(100),low=staminaEffects(15),empty=staminaEffects(0);
 assert.ok(full.movement>low.movement&&low.movement>empty.movement);
 assert.ok(full.pace>low.pace&&low.pace>empty.pace);
 assert.equal(staminaEffects(60).scatter,0);assert.ok(staminaEffects(30).scatter>1.8);
 const target={x:4.2,z:11.5};assert.deepEqual(fatigueTarget(target,100),target);
 const miss=fatigueTarget(target,0,()=>1);assert.ok(miss.x>4.67);
 assert.ok(Math.hypot(miss.x-target.x,miss.z-target.z)<=4.200001);
 assert.deepEqual(target,{x:4.2,z:11.5});
});
test('new match clears exhaustion and caps',()=>{
 const e=new Stamina();e.spend(0,100);e.finishPoint();e.spend(1,100);e.reset();
 assert.deepEqual(e.values,[100,100]);assert.deepEqual(e.caps,[100,100]);assert.deepEqual(e.exhausted,[false,false]);
});
test('point-end refill eases toward 90 with a permanent 10 percent dead zone',()=>{
 const e=new Stamina();e.spend(0,100);e.finishPoint();
 let display=staminaDisplay(0,0,e.values[0],e.caps[0],1/60);
 assert.ok(display.displayed>0&&display.displayed<90);
 assert.ok(Math.abs(display.deadZone-.1)<1e-9);
 for(let i=0;i<300;i++)display=staminaDisplay(display.displayed,display.trailing,90,90,1/60);
 assert.equal(display.displayed,90);assert.equal(display.fill,.9);assert.ok(display.trail<=.9);
 const clipped=staminaDisplay(100,100,90,90,0);
 assert.equal(clipped.fill,.9);assert.equal(clipped.trail,.9);
});
test('display recovery uses elapsed time and respects configured recovery speed',()=>{
 const whole=staminaDisplay(10,10,90,90,.5);
 let split={displayed:10,trailing:10};
 for(let i=0;i<30;i++)split=staminaDisplay(split.displayed,split.trailing,90,90,1/60);
 assert.ok(Math.abs(whole.displayed-split.displayed)<1e-9);
 const old=CONFIG.stamina.displayRiseRate;
 try{CONFIG.stamina.displayRiseRate=old/2;assert.ok(staminaDisplay(10,10,90,90,.5).displayed<whole.displayed)}finally{CONFIG.stamina.displayRiseRate=old}
});
test('stamina configuration changes recovery, cap loss and low-energy penalties',()=>{
 const old={...CONFIG.stamina};
 try{
  Object.assign(CONFIG.stamina,{recoveryPerSecond:5,capRetention:.8,lowThreshold:50,maximumScatter:3});
  const e=new Stamina();e.spend(0,100);e.recover(1);assert.equal(e.values[0],5);
  e.finishPoint();assert.equal(e.caps[0],80);
  assert.ok(staminaEffects(40).pace<1);assert.equal(staminaEffects(0).scatter,3);
 }finally{Object.assign(CONFIG.stamina,old)}
});
