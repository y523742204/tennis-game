import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Stamina,staminaEffects,fatigueTarget} from '../dist/stamina.js';
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
 assert.equal(staminaEffects(30).scatter,0);
 const target={x:4.2,z:11.5};assert.deepEqual(fatigueTarget(target,100),target);
 const miss=fatigueTarget(target,0,()=>1);assert.ok(miss.x>4.67);
 assert.ok(Math.hypot(miss.x-target.x,miss.z-target.z)<=1.600001);
 assert.deepEqual(target,{x:4.2,z:11.5});
});
test('new match clears exhaustion and caps',()=>{
 const e=new Stamina();e.spend(0,100);e.finishPoint();e.spend(1,100);e.reset();
 assert.deepEqual(e.values,[100,100]);assert.deepEqual(e.caps,[100,100]);assert.deepEqual(e.exhausted,[false,false]);
});
