import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseComputerReturn,selectComputerContact} from '../dist/computer-strategy.js';
import {CONFIG as CFG} from '../dist/config.js';
import {solveShot} from '../dist/shot.js';

function situation(end=-1){
  return {end,position:{x:0,z:10*end},opponent:{x:0,z:-10*end},
    contact:{x:0,z:10*end,ball:{x:.68*end,y:1.1,z:9.4*end},reachable:true},
    remaining:.3,speed:6.8,stamina:100,difficulty:'normal'};
}
const choose=s=>chooseComputerReturn(s,()=>.5);

test('neutral rallies pressure the right-handed backhand and rotate with ends',()=>{
  for(const end of [1,-1]){
    const s=situation(end),shot=choose(s);
    assert.equal(shot.tactic,'backhand');assert.equal(shot.type,'top');
    assert.ok((shot.target.x-s.opponent.x)*-end<CFG.shot.backhandThreshold);
    assert.ok(shot.target.z*end<0);
    assert.deepEqual(choose(s),shot);
  }
});
test('follows opponent recovery across successive shots instead of alternating blindly',()=>{
  const s=situation();
  for(const x of [-3,3,-2.5,2.5]){
    s.opponent.x=x;
    const shot=choose(s);
    assert.equal(shot.tactic,'open');assert.ok(shot.target.x*x<0);
    assert.ok(shot.power>choose(situation()).power);
  }
});
test('short attackable balls use flat drives into the open court',()=>{
  const s=situation();s.opponent.x=3;s.contact.ball.z=-4.5;
  assert.equal(choose(s).type,'flat');assert.equal(choose(s).tactic,'open');
});
test('passing selects the lane farthest from the opponent along the flight path',()=>{
  for(const end of [1,-1]){
    const s=situation(end);s.opponent={x:.4*end,z:-3*end};
    const shot=choose(s);assert.equal(shot.tactic,'pass');assert.equal(shot.type,'flat');
    const t=(s.opponent.z-s.contact.ball.z)/(shot.target.z-s.contact.ball.z);
    const gap=x=>Math.abs(s.contact.ball.x+(x-s.contact.ball.x)*t-s.opponent.x);
    assert.ok(gap(shot.target.x)>=gap(-shot.target.x));
  }
});
test('wide, deep, late, unreachable and fatigued contacts reduce power and defend',()=>{
  for(const change of [s=>s.contact.ball.x=4.5,s=>s.contact.ball.z=-13,
    s=>s.remaining=.01,s=>s.contact.x=2,s=>s.contact.reachable=false,s=>s.stamina=20]){
    const s=situation();s.opponent.x=3;change(s);
    const shot=choose(s);assert.equal(shot.tactic,'defend');assert.equal(shot.type,'top');
    assert.ok(shot.power<choose(situation()).power);assert.ok(Math.abs(shot.target.x)<2);
    assert.ok(Math.abs(shot.target.z)>8);
  }
});
test('low defensive contacts slice; pressured returns still avoid a net player',()=>{
  const s=situation();s.contact.ball.y=.5;
  assert.equal(choose(s).type,'slice');
  s.opponent={x:2,z:3};
  const shot=choose(s);assert.equal(shot.tactic,'defend');assert.ok(shot.target.x<0);
});
test('difficulty changes recognition, placement and power even at equal running speed',()=>{
  const s=situation();s.opponent.x=1;
  const easy=choose({...s,difficulty:'easy'}),hard=choose({...s,difficulty:'hard'});
  assert.equal(easy.tactic,'backhand');assert.equal(hard.tactic,'open');
  s.opponent.x=3;
  const shots=['easy','normal','hard'].map(difficulty=>choose({...s,difficulty}));
  for(let i=1;i<shots.length;i++){
    assert.ok(Math.abs(shots[i].target.x)>Math.abs(shots[i-1].target.x));
    assert.ok(Math.abs(shots[i].target.z)>Math.abs(shots[i-1].target.z));
    assert.ok(shots[i].power>shots[i-1].power);
  }
  const error=difficulty=>Math.abs(chooseComputerReturn({...s,difficulty},()=>1).target.x-choose({...s,difficulty}).target.x);
  assert.ok(error('easy')>error('hard'));
});
test('bounded execution variation preserves tactical intent, safe targets and valid power',()=>{
  for(const end of [1,-1])for(const difficulty of ['easy','normal','hard'])for(const random of [()=>0,()=>.5,()=>1]){
    const s=situation(end);s.difficulty=difficulty;s.opponent.x=3;
    const shot=chooseComputerReturn(s,random);
    assert.equal(shot.tactic,'open');assert.ok(shot.target.x<0);
    assert.ok(Math.abs(shot.target.x)<=CFG.court.halfWidth-CFG.shot.aimLineMargin);
    assert.ok(shot.target.z*-end>=2&&shot.target.z*-end<=CFG.court.halfLength-CFG.shot.aimLineMargin);
    assert.ok(shot.power>=CFG.input.minimumPower&&shot.power<=CFG.input.minimumPower+CFG.input.powerRange);
    assert.equal(typeof shot.perfect,'boolean');
  }
});
test('tactical shots retain legal finite trajectories through the existing flight solver',()=>{
  for(const end of [1,-1])for(const kind of [null,'volley','smash'])for(const mode of ['backhand','open','pass','defend']){
    const s=situation(end);s.contact.kind=kind;
    if(kind){s.contact.ball.z=4*end;s.contact.ball.y=kind==='smash'?3:1.4;}
    if(mode==='open')s.opponent.x=3;
    if(mode==='pass')s.opponent.z=-3*end;
    if(mode==='defend'){s.contact.ball.y=.5;s.contact.kind=null;}
    const choice=choose(s),shot=solveShot(s.contact.ball,choice.target,choice.type,choice.power);
    if(kind&&mode!=='defend')assert.equal(choice.type,kind);
    assert.ok(Number.isFinite(shot.speedKmh));
    assert.ok(shot.netHeight>=CFG.shot.netTop+CFG.physics.ballRadius);
    assert.ok(Math.hypot(shot.landing.x-choice.target.x,shot.landing.z-choice.target.z)<.15);
  }
});
test('well prepared groundstrokes can be Perfect, while pressured rescues cannot',()=>{
  const ready=situation();ready.remaining=.8;
  const perfect=chooseComputerReturn(ready,()=>0);
  assert.equal(perfect.perfect,true);
  const rescued={...ready,contact:{...ready.contact,rescued:true}};
  assert.equal(chooseComputerReturn(rescued,()=>0).perfect,false);
  assert.equal(chooseComputerReturn({...ready,difficulty:'easy'},()=>.9).perfect,false);
});
test('short balls invite an approach only with opponent displacement and enough stamina',()=>{
  const s=situation();s.remaining=.8;s.contact.ball.z=-5;s.opponent.x=2;
  assert.equal(chooseComputerReturn(s,()=>.5).approach,true);
  assert.equal(chooseComputerReturn({...s,opponent:{x:0,z:10}},()=>.5).approach,false);
  assert.equal(chooseComputerReturn({...s,stamina:30},()=>.5).approach,false);
});
test('a narrowly unreachable contact becomes a stamina-priced rescue only when boosted speed reaches it',()=>{
  const landing={x:2.8,z:-9,time:.1};
  const samples=[{x:3.68,y:1.1,z:-9.4,vx:0,vy:1,vz:-8,time:.58,bounces:1,landing}];
  const options={position:{x:0,z:-10},end:-1,speed:4.8,stamina:100,allowAir:false,preference:'baseline'};
  const contact=selectComputerContact(samples,options);
  assert.ok(contact?.rescued);assert.equal(contact.reachable,true);
  assert.equal(contact.rescueCost,CFG.ai.rescueStaminaCost);
  assert.equal(contact.rescueSpeedFactor,CFG.ai.rescueSpeedMultiplier);
  assert.equal(selectComputerContact(samples,{...options,stamina:10}).rescued,undefined);
});
