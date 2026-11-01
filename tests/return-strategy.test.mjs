import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ReturnStrategy} from '../dist/return-strategy.js';
const choice=(type='flat',power=65)=>({type,power,perfect:false,gauge:.5,target:{x:1,z:-8}});
test('early release locks the shot without consuming it before contact',()=>{
 const q=new ReturnStrategy();q.open(choice());assert.ok(q.lock(choice('top',80)));
 assert.ok(q.active);assert.equal(q.current(choice('slice',40)).type,'top');
 assert.equal(q.resolve().power,80);assert.equal(q.active,false);assert.equal(q.resolve(),null);
});
test('at contact a held selection uses its current type, power, timing and target',()=>{
 const q=new ReturnStrategy();q.open(choice());const live={...choice('slice',72),perfect:true,gauge:.51,target:{x:-3,z:-9}};
 assert.deepEqual(q.resolve(live),live);
});
test('without input contact still executes the safe default',()=>{
 const q=new ReturnStrategy();q.open(choice());assert.deepEqual(q.resolve(),choice());
});
test('locked choices are immutable and cannot be replaced by a late release',()=>{
 const q=new ReturnStrategy(),draft=choice('top',80);q.open(choice());q.lock(draft);
 draft.target.x=99;draft.power=10;assert.equal(q.lock(choice('slice')),false);
 const saved=q.current();saved.target.z=99;assert.equal(q.resolve().target.z,-8);
});
test('new incoming ball and point end discard an old locked shot',()=>{
 const q=new ReturnStrategy();q.open(choice());q.lock(choice('slice'));q.close();assert.equal(q.current(),null);
 q.open(choice());assert.equal(q.locked,null);assert.equal(q.resolve().type,'flat');
});
