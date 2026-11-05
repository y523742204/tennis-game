import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {CONFIG as CFG} from '../dist/config.js';import {clampPlayerTarget} from '../dist/court.js';
const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const move=source.slice(source.indexOf('function movePlayerTo('),source.indexOf('function recoverPlayers('));
test('net rush accelerates forward movement with a finite budget and normal run stamina cost',()=>{
 const p={x:0,z:11},ctx={CFG,clampPlayerTarget,players:[{position:p}],humanPositionMode:'net',netRushRemaining:10,ends:[1,-1],runSpeed:()=>6,spent:0};ctx.spendEnergy=(who,n)=>ctx.spent+=n;
 vm.createContext(ctx);vm.runInContext(move,ctx);vm.runInContext('movePlayerTo(0,{x:0,z:3.2},.1)',ctx);
 assert.ok(Math.abs(p.z-(11-1.08))<1e-10);assert.ok(Math.abs(ctx.spent-1.08*CFG.stamina.runCostPerMeter)<1e-10);assert.ok(ctx.netRushRemaining<10);
 const before=p.z,budget=ctx.netRushRemaining;vm.runInContext('movePlayerTo(0,{x:0,z:14},.1)',ctx);assert.ok(Math.abs(p.z-before-.6)<1e-10);assert.equal(ctx.netRushRemaining,budget);
 for(let i=0;i<30;i++)vm.runInContext('movePlayerTo(0,{x:0,z:3.2},.1)',ctx);
 assert.equal(p.z,3.2);assert.equal(ctx.netRushRemaining,0);
});
