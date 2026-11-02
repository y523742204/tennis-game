import {test} from 'node:test';
import assert from 'node:assert/strict';
import {servePad,spinVector,aerodynamicForce,PHYSICS_STEP,flightTimeScale} from '../dist/flight.js';
test('serve joystick has a flat center, upper topspin and bounded mixed directions',()=>{
 assert.deepEqual(servePad(.04,.02),{x:0,y:0});
 assert.deepEqual(servePad(0,-1),{x:0,y:0});
 const p=servePad(3,4);assert.ok(Math.abs(Math.hypot(p.x,p.y)-1)<1e-10);assert.ok(Math.abs(p.x-.6)<1e-12);assert.ok(Math.abs(p.y-.8)<1e-12);
});
test('topspin forces downward, slice upward, flat has no Magnus lift',()=>{
 const v={x:0,y:0,z:-17};
 assert.ok(aerodynamicForce(v,spinVector('top',v)).y<0);
 assert.ok(aerodynamicForce(v,spinVector('slice',v)).y>0);
 assert.ok(Math.abs(aerodynamicForce(v,spinVector('flat',v)).y)<1e-12);
});
test('left and right serve spin produce opposite physical flight curves',()=>{
 function flight(side){const p={x:0,y:2.6,z:12},v={x:0,y:5,z:-17},w=spinVector('flat',v,servePad(side,0));
  for(let i=0;i<240;i++){const f=aerodynamicForce(v,w);v.x+=f.x/.057*PHYSICS_STEP;v.y+=(f.y/.057-9.81)*PHYSICS_STEP;v.z+=f.z/.057*PHYSICS_STEP;for(const axis of ['x','y','z']){p[axis]+=v[axis]*PHYSICS_STEP;w[axis]*=Math.pow(.8,PHYSICS_STEP)}}return p;
 }
 const left=flight(-1),right=flight(1);assert.ok(left.x<-.1);assert.ok(right.x>.1);assert.ok(Math.abs(left.x+right.x)<1e-9);
});
test('topspin stays downward and screen-right sidespin reverses after changing ends',()=>{
 const v={x:2,y:0,z:16},spin=spinVector('flat',v,{x:1,y:1});
 const force=aerodynamicForce(v,spin);assert.ok(force.y<0);assert.ok(force.x<0);
});
test('serve tempo is unchanged while rallies get a longer real-time selection window',()=>{
 assert.equal(flightTimeScale(true),.62);assert.equal(flightTimeScale(false),.52);
 assert.ok(1/flightTimeScale(false)>1/flightTimeScale(true));
});
