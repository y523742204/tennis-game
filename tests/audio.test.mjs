import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TennisAudio} from '../dist/audio.js';
function fakeContext(){
 const c={state:'suspended',currentTime:0,sampleRate:100,destination:{},started:0,resumes:0};
 const param=()=>({value:0,setValueAtTime(){},setTargetAtTime(v){this.value=v},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>({gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){},start(){c.started++},stop(){this.onended?.()}});
 c.createGain=node;c.createOscillator=node;c.createBufferSource=node;c.createBiquadFilter=node;
 c.createBuffer=(_,size)=>({getChannelData:()=>new Float32Array(size)});
 c.resume=async()=>{c.resumes++;c.state='running'};return c;
}
test('sound waits for a gesture, supports mute and reuses one audio context',async()=>{
 const c=fakeContext();let created=0;const sound=new TennisAudio(()=>{created++;return c});
 sound.hit();assert.equal(created,0);assert.equal(c.started,0);
 assert.equal(await sound.unlock(),true);assert.equal(c.resumes,1);
 sound.hit();assert.equal(c.started,2);
 sound.setEnabled(false);sound.hit({perfect:true});sound.point(true);assert.equal(c.started,2);
 sound.setEnabled(true);await sound.unlock();sound.hit({perfect:true});assert.equal(c.started,5);assert.equal(created,1);
});
test('bounce and net sounds debounce repeated physics contacts',async()=>{
 const c=fakeContext(),sound=new TennisAudio(()=>c);await sound.unlock();
 sound.bounce();sound.bounce();assert.equal(c.started,2);
 c.currentTime=.2;sound.bounce();assert.equal(c.started,4);
 sound.net();sound.net();assert.equal(c.started,6);
});
test('unsupported or blocked audio does not interrupt the game',async()=>{
 const missing=new TennisAudio(()=>null);assert.equal(await missing.unlock(),false);assert.doesNotThrow(()=>missing.hit());
 const c=fakeContext();c.resume=async()=>{throw Error('blocked')};
 const blocked=new TennisAudio(()=>c);assert.equal(await blocked.unlock(),false);blocked.hit();assert.equal(c.started,0);
});
