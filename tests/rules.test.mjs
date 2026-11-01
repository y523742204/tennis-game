import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TennisMatch,validServiceLanding} from '../dist/rules.js';
const game=(m,p)=>{for(let i=0;i<4;i++)m.award(p)};
test('serve must land in diagonal box, including after changing ends',()=>{
 assert.ok(validServiceLanding(-2,-4,1,0));assert.ok(validServiceLanding(2,-4,1,1));
 assert.ok(validServiceLanding(2,4,-1,0));assert.ok(validServiceLanding(-2,4,-1,1));
 assert.equal(validServiceLanding(2,-4,1,0),false);assert.equal(validServiceLanding(-2,-7,1,0),false);
 assert.equal(validServiceLanding(-2,4,1,0),false);assert.ok(validServiceLanding(-4.55,-5.55,1,0));
});
test('standard scoring, sides and game service rotation',()=>{
 const m=new TennisMatch();assert.equal(m.server,0);assert.equal(m.serviceSide,0);
 m.award(0);assert.deepEqual(m.labels(),['15','0']);assert.equal(m.serviceSide,1);assert.equal(m.server,0);
 m.award(1);assert.equal(m.serviceSide,0);m.award(0);m.award(0);m.award(0);
 assert.deepEqual(m.games,[1,0]);assert.deepEqual(m.labels(),['0','0']);assert.equal(m.server,1);assert.equal(m.serviceSide,0);
});
test('deuce, advantage and return to deuce',()=>{
 const m=new TennisMatch();for(let i=0;i<3;i++){m.award(0);m.award(1)}
 assert.deepEqual(m.labels(),['40','40']);m.award(0);assert.deepEqual(m.labels(),['AD','40']);m.award(1);assert.deepEqual(m.labels(),['40','40']);m.award(1);m.award(1);assert.deepEqual(m.games,[0,1]);
});
test('no-ad receiver can select court and next point wins game',()=>{
 const m=new TennisMatch({noAd:true});for(let i=0;i<3;i++){m.award(0);m.award(1)}
 assert.ok(m.decidingPoint);m.sideOverride=1;assert.equal(m.serviceSide,1);m.award(1);assert.deepEqual(m.games,[0,1]);assert.equal(m.sideOverride,null);
});
test('set requires two-game lead, tiebreak service sequence and seven by two',()=>{
 const m=new TennisMatch({gamesToWin:4});for(let i=0;i<3;i++){game(m,0);game(m,1)}game(m,0);
 assert.equal(m.winner,null);game(m,1);assert.ok(m.tieBreak);
 const servers=[];for(let i=0;i<12;i++){servers.push(m.server);m.award(i%2)}
 assert.deepEqual(servers,[0,1,1,0,0,1,1,0,0,1,1,0]);assert.equal(m.winner,null);
 m.award(0);assert.equal(m.winner,null);m.award(0);assert.equal(m.winner,0);assert.deepEqual(m.games,[5,4]);
});
test('odd games change ends, one set finishes',()=>{
 const m=new TennisMatch({gamesToWin:2});m.award(0);m.award(0);m.award(0);assert.equal(m.award(0).changeEnds,true);game(m,0);assert.equal(m.winner,0);assert.deepEqual(m.sets,[1,0]);
});

