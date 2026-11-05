import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERS,characterById,abilityFactor,radarMarkup} from '../dist/characters.js';

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
  for(const key of 'MTDJF')assert.match(markup,new RegExp(`>${key}<`));
  assert.equal((markup.match(/radar-value/g)||[]).length,1);
});
