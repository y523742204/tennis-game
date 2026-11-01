import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectContact,recoveryPosition,travelTime} from '../dist/tactics.js';
const landing={x:0,z:7,time:1};
const sample=(z,y,time,vy=2)=>({x:0,y,z,vx:0,vy,vz:9,time,bounces:1,landing});
test('intercept waits beyond the landing for waist height, not the first rising low ball',()=>{
 const samples=[sample(7.3,.55,1.04),sample(7.8,.72,1.1),sample(9,1.1,1.28),sample(9.8,1.5,1.4)];
 const c=selectContact(samples,{position:{x:-.68,z:9.6},end:1,speed:6.5});
 assert.equal(c.ball.y,1.1);assert.equal(c.ball.z,9);assert.ok(c.extension>=1.05);assert.equal(c.z,9.6);
});
test('late player uses a reachable descending waist contact instead of missing early',()=>{
 const early=sample(9,1.1,1.28),late=sample(12,1.1,2.3,-2);
 const c=selectContact([early,late],{position:{x:6,z:12.6},end:1,speed:3});
 assert.equal(c.time,2.3);assert.ok(c.reachable);assert.equal(c.ball.vy,-2);
});
test('low bouncing ball uses its attainable apex, never a fictitious waist point',()=>{
 const c=selectContact([sample(7.1,.2,1.01),sample(7.9,.7,1.22,0),sample(8.5,.45,1.4,-2)],{position:{x:0,z:9},end:1,speed:6});
 assert.equal(c.ball.y,.7);assert.equal(c.waist,false);
});
test('stance can use either forehand or backhand and mirrors when ends switch',()=>{
 const point=sample(9,1.1,1.4);
 const backhand=selectContact([point],{position:{x:.68,z:9.6},end:1,speed:6});assert.ok(backhand.backhand);
 const mirrored={...point,x:-point.x,z:-point.z,vz:-point.vz,landing:{...landing,z:-7}};
 const c=selectContact([mirrored],{position:{x:.68,z:-9.6},end:-1,speed:6});assert.equal(c.z,-9.6);assert.equal(c.x,.68);assert.equal(c.backhand,false);
});
test('recovery covers the return-angle bisector and is mirrored on change of ends',()=>{
 const right=recoveryPosition({end:1,opponentContact:{x:4,z:-9},strikePosition:{x:4,z:10}});
 const left=recoveryPosition({end:1,opponentContact:{x:-4,z:-9},strikePosition:{x:-4,z:10}});
 assert.ok(right.x>0&&right.x<2);assert.ok(Math.abs(right.x+left.x)<1e-10);assert.equal(right.z,10.8);
 const other=recoveryPosition({end:-1,opponentContact:{x:-4,z:9},strikePosition:{x:-4,z:-10}});
 assert.ok(Math.abs(other.x+right.x)<1e-10);assert.equal(other.z,-10.8);
});
test('reach time includes stamina drained during running',()=>{
 assert.ok(travelTime(8,6.5,100)>8/6.5);assert.ok(travelTime(8,3,10)>8/3);assert.ok(Number.isFinite(travelTime(20,3,0)));
});
