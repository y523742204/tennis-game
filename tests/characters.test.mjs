import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERS,AXES,characterById,createCustomCharacter,adjustStats,abilityFactor,radarMarkup} from '../dist/characters.js';

test('six named characters each distribute exactly 20 points across MTDJF',()=>{
  assert.deepEqual(CHARACTERS.map(character=>character.name),['无敌飞毛腿','底线大魔王','暴力机关枪','网前终结者','发球火箭筒','均衡守护者']);
  assert.deepEqual(CHARACTERS.map(character=>Object.values(character.stats).join('')),['64442','46424','44624','64262','24266','44444']);
  for(const character of CHARACTERS)assert.equal(Object.values(character.stats).reduce((sum,value)=>sum+value,0),20);
});
test('ability factors reward specialties, penalize weaknesses and keep balance neutral',()=>{
  assert.ok(abilityFactor(characterById('runner'),'M')>1);
  assert.ok(abilityFactor(characterById('server'),'M')<1);
  for(const key of 'MTDJF')assert.equal(abilityFactor(characterById('guardian'),key),1);
});
test('radar markup exposes all five axes and one value polygon',()=>{
  const markup=radarMarkup(characterById('finisher'));
  for(const axis of AXES)assert.match(markup,new RegExp(`>${axis.label}<`));
  assert.equal((markup.match(/radar-value/g)||[]).length,1);
  assert.doesNotMatch(markup,/>[1-6]</);
});
test('custom characters start at 20 points and expose five draggable handles',()=>{
  const character=createCustomCharacter('human'),markup=radarMarkup(character,{interactive:true});
  assert.equal(Object.values(character.stats).reduce((sum,value)=>sum+value,0),20);
  assert.equal((markup.match(/radar-handle/g)||[]).length,5);
  assert.equal(character.custom,true);
});
test('drag adjustment keeps every stat bounded and the total fixed at 20',()=>{
  let stats=createCustomCharacter().stats;
  for(const [key,value] of [['M',6],['F',1],['D',6],['T',1]]){
    stats=adjustStats(stats,key,value);
    assert.equal(Object.values(stats).reduce((sum,point)=>sum+point,0),20);
    assert.ok(Object.values(stats).every(point=>point>=1&&point<=6));
  }
});
