import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG} from '../dist/config.js';
import {courtDimensions,insidePlayerArea,clampPlayerTarget} from '../dist/court.js';
test('standard court has the full international minimum runoff on every side',()=>{
 const d=courtDimensions(),c=CONFIG.court;
 assert.equal(c.halfWidth*2,8.23);assert.equal(c.halfLength*2,23.77);assert.equal(c.doublesHalfWidth*2,10.97);
 assert.ok(Math.abs(d.width-18.29)<1e-9);assert.ok(Math.abs(d.length-36.57)<1e-9);
 assert.ok(Math.abs(d.halfWidth-c.doublesHalfWidth-3.66)<1e-9);
 assert.ok(Math.abs(d.halfLength-c.halfLength-6.4)<1e-9);
});
test('players can run deep into buffers but cannot leave the modelled court',()=>{
 assert.equal(insidePlayerArea({x:8,z:17}),true);assert.equal(insidePlayerArea({x:10,z:19}),false);
 const target=clampPlayerTarget({x:100,z:-100});assert.equal(insidePlayerArea(target),true);
 assert.ok(target.x>8);assert.ok(target.z<-17);
});
