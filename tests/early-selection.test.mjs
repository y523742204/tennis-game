import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {CONFIG} from '../dist/config.js';
import {ReturnStrategy} from '../dist/return-strategy.js';
import {serveVelocityError,netShotTargetError} from '../dist/accuracy.js';
import {chooseComputerReturn} from '../dist/computer-strategy.js';
import {flightTimeScale} from '../dist/flight.js';

// 执行游戏实际的出拍/接球边界，检查 UI 长按生命周期，而不启动 WebGL。
const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const launch=source.slice(source.indexOf('function launchStroke('),source.indexOf('function step('));
const step=source.slice(source.indexOf('function step('),source.indexOf('function cancelHold('));
const computer=source.slice(source.indexOf('function currentComputerReturn('),source.indexOf('let displayedStamina='));
function fixture(){
 const choice={type:'top',power:80,perfect:false,gauge:.75,target:{x:2,z:-9}};
 const strategy=new ReturnStrategy();strategy.afterOwnShot(choice);
 const vec=()=>({x:0,y:1,z:0,copy(){},set(){},setZero(){}});
 const ctx={flightTimeScale,chooseComputerReturn,difficulty:'normal',runSpeed:()=>6.8,humanPositionMode:'baseline',cpuPositionMode:'baseline',CFG:CONFIG,serveVelocityError,netShotTargetError,serveAttempt:1,THREE:{MathUtils:{clamp:(n,a,b)=>Math.max(a,Math.min(b,n))}},returnStrategy:strategy,
  hold:{id:4,ready:true,chargeStart:1234,mode:'rally'},cancelled:0,retiredPointerId:null,
  isServe:false,flightIsServe:false,match:{serviceSide:0},ends:[1,-1],selected:'top',gauge:.75,aim:choice.target,
  physicalBall:{position:vec(),velocity:vec(),angularVelocity:vec(),force:vec(),torque:vec()},stamina:[100,100],
  trajectory:()=>({v:{x:0,y:0,z:30},spin:{x:0,y:0,z:0},landing:{x:0,z:8}}),fatigueTarget:t=>t,
  energy:{spend(){}},cost:()=>0,sounds:{hit(){}},showShotSpeed(){},speedKmh:()=>120,
  lastHitter:0,bounces:1,decision:null,netTouched:false,elapsed:1,acc:0,phase:'flight',
  plan:{receiver:1,x:0,z:0,time:0,ball:{x:0,z:0}},
  predict:()=>({receiver:0,x:0,z:8,time:1,ball:{x:0,z:8},landing:{x:0,z:6}}),
  recoveryTargets:[null,null],recoveryDelay:[0,0],recoveryPosition:()=>({x:0,z:10}),updateContactGuide(){},
  rallyWindup:{receiver:1,started:true,choice:{...choice,type:'flat',power:65}},
  currentReturnChoice:()=>choice,dirty:false,aimLine:{visible:true},marker:{visible:true,position:{set(){}}},say(){},ui(){},
  recoverPlayers(){},movePlayerTo(){},forces(){},world:{step(){}},
  players:[0,1].map(()=>({position:vec(),userData:{rig:{swing:{duration:1.05,contact:.42}}}})),
  courtSize:CONFIG.court,contactGuide:{visible:true},turn:1,pendingStroke:null};
 ctx.cancelHold=()=>{ctx.hold=null;ctx.cancelled++};ctx.clearReturn=()=>{strategy.close();ctx.rallyWindup=null};
 ctx.spendEnergy=(who,amount)=>ctx.energy.spend(who,amount);
 vm.createContext(ctx);vm.runInContext(computer+launch+step,ctx);return ctx;
}
test('opponent contact preserves an ongoing long press and its charge clock',()=>{
 const ctx=fixture(),hold=ctx.hold;vm.runInContext('step(1/240)',ctx);
 assert.equal(ctx.lastHitter,1);assert.equal(ctx.hold,hold);assert.equal(ctx.hold.chargeStart,1234);
 assert.equal(ctx.cancelled,0);assert.equal(ctx.returnStrategy.active,true);assert.equal(ctx.selected,'top');
});
test('opponent contact preserves a locked outgoing choice',()=>{
 const ctx=fixture();ctx.hold=null;ctx.returnStrategy.lock(ctx.currentReturnChoice());
 vm.runInContext('step(1/240)',ctx);
 assert.equal(ctx.returnStrategy.locked.power,80);assert.equal(ctx.returnStrategy.locked.target.z,-9);
});
test('own launch opens the next selection immediately with no stale lock',()=>{
 const ctx=fixture();ctx.returnStrategy.lock(ctx.currentReturnChoice());
 vm.runInContext("launchStroke(0,'flat',65)",ctx);
 assert.equal(ctx.phase,'flight');assert.equal(ctx.returnStrategy.active,true);assert.equal(ctx.returnStrategy.locked,null);
 assert.equal(ctx.hold,null);assert.equal(ctx.selected,'flat');
 assert.equal(ctx.players[1].userData.rig.splitStep,0);
 assert.equal(ctx.players[0].userData.rig.splitStep,undefined);
});
test('first and second serves spend no shot stamina, rallies still do',()=>{
 for(const serving of [true,false])for(const attempt of [1,2]){
  const ctx=fixture();ctx.isServe=serving;ctx.serveAttempt=attempt;let spent=0;
  ctx.energy.spend=()=>spent++;ctx.cost=()=>10;
  vm.runInContext("launchStroke(0,'flat',65)",ctx);
  assert.equal(spent,serving?0:1);
 }
});
test('air contact executes special stroke while preserving the selected aim and power',()=>{
 for(const kind of ['volley','smash']){
  const ctx=fixture();ctx.plan.kind=kind;let played;
  ctx.trajectory=(who,type,target,power)=>{played={type,power};return {v:{x:0,y:0,z:30},spin:{x:0,y:0,z:0}}};
  vm.runInContext('step(1/240)',ctx);
  assert.equal(played.type,kind);assert.equal(played.power,65);assert.equal(ctx.lastHitter,1);
 }
});
test('computer reads latest opponent position at windup and executes that complete choice once',()=>{
 const ctx=fixture();ctx.elapsed=0;ctx.plan={receiver:1,x:0,z:-10,time:.22,reachable:true,ball:{x:-.68,y:1.1,z:-9.4}};
 ctx.players[1].position.z=-10;ctx.players[0].position.z=10;ctx.players[0].position.x=3;
 ctx.rallyWindup={receiver:1,started:false,choice:null};let strokes=0,played;
 ctx.beginStroke=()=>{strokes++};
 ctx.trajectory=(who,type,target,power)=>{played={type,target,power};return {v:{x:0,y:0,z:30},spin:{x:0,y:0,z:0}}};
 vm.runInContext('step(1/240)',ctx);
 const choice=ctx.rallyWindup.choice;assert.equal(choice.tactic,'open');assert.ok(choice.target.x<0);
 ctx.players[0].position.x=-3;
 vm.runInContext('step(1/240)',ctx);
 assert.equal(ctx.rallyWindup.choice,choice);assert.equal(strokes,1);
 vm.runInContext('step(.22)',ctx);
 assert.equal(played.target.x,choice.target.x);assert.equal(played.target.z,choice.target.z);
 assert.equal(played.type,choice.type);assert.equal(played.power,choice.power);
 assert.equal(ctx.lastHitter,1);
});
