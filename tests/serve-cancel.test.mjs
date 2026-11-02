import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {cancelsServe,viewportLayout} from '../dist/viewport.js';
import {CONFIG as CFG} from '../dist/config.js';
const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const move=source.slice(source.indexOf('function moveHold('),source.indexOf('function finishHold('));
test('serve drag into safe-area-aware top zone cancels without firing or changing target',()=>{
 const layout=viewportLayout(390,844,{top:44},true);
 const ctx={CFG,cancelsServe,screenLayout:layout,hold:{id:7,ready:true,mode:'serve',spinOrigin:{x:180,y:400},radius:82},retiredPointerId:null,ignoreNextClick:false,serveSpin:{x:1,y:0},gauge:.9,dirty:false,aim:{x:2,z:-5},say(){},cancelHold(){ctx.hold=null}};
 vm.createContext(ctx);vm.runInContext(move,ctx);
 ctx.event={pointerId:7,clientX:180,clientY:60,preventDefault(){}};
 vm.runInContext('moveHold(event)',ctx);
 assert.equal(ctx.hold,null);assert.equal(ctx.retiredPointerId,7);assert.equal(ctx.ignoreNextClick,true);assert.equal(ctx.gauge,.5);assert.deepEqual(ctx.aim,{x:2,z:-5});
 assert.equal(cancelsServe(layout,400-82),false,'full topspin on dial must not cancel');
 assert.equal(cancelsServe(layout,44+CFG.input.serveCancelTop),true);
});
