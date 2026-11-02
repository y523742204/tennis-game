import {CONFIG as CFG} from './config.js';
import {insidePlayerArea} from './court.js';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const WAIST_HEIGHT=CFG.tactics.waistHeight;
export function travelTime(distance,speed,stamina=CFG.stamina.full) {
  if(distance<=0)return 0;
  const slope=(1-CFG.stamina.minimumMoveMultiplier)/CFG.stamina.full,base=speed/(CFG.stamina.minimumMoveMultiplier+slope*stamina),decay=base*slope*CFG.stamina.runCostPerMeter;
  if(decay===0)return distance/speed;
  const tiring=Math.min(distance,stamina/CFG.stamina.runCostPerMeter),remaining=distance-tiring;
  return Math.log(speed/Math.max(base*CFG.stamina.minimumMoveMultiplier,speed-decay*tiring))/decay+remaining/(base*CFG.stamina.minimumMoveMultiplier);
}
export function selectAirContact(samples,{position,end,speed,stamina=CFG.stamina.full}) {
  const t=CFG.tactics,candidates=[];
  for(const ball of samples){
    if(ball.bounces!==0||ball.z*end<t.minimumNetDistance||ball.vz*end<=0)continue;
    const pace=Math.hypot(ball.vx,ball.vy,ball.vz);
    const kind=ball.vy<=0&&ball.y>=t.smashMinHeight&&ball.y<=t.smashMaxHeight&&pace<=t.smashMaxSpeed?'smash':
      ball.z*end<=t.volleyDepth&&ball.y>=t.volleyMinHeight&&ball.y<=t.volleyMaxHeight&&pace<=t.volleyMaxSpeed?'volley':null;
    if(!kind)continue;
    for(const side of [1,-1]){
      const stance={x:ball.x-side*t.stanceSide*end,z:ball.z+t.stanceBehind*end,backhand:kind==='volley'&&side<0};
      const distance=Math.hypot(stance.x-position.x,stance.z-position.z);
      if(!insidePlayerArea(stance)||ball.time-travelTime(distance,speed,stamina)<t.airSetupTime)continue;
      candidates.push({...stance,kind,ball,time:ball.time,landing:null,reachable:true,score:ball.time+distance*.04});
    }
  }
  return candidates.sort((a,b)=>a.score-b.score)[0]||null;
}
export function selectContact(samples,{position,end,speed,stamina=CFG.stamina.full,allowAir=false}) {
  const air=allowAir?selectAirContact(samples,{position,end,speed,stamina}):null;
  if(air)return air;
  const candidates=[];
  for(const ball of samples){
    if(ball.bounces!==1||!ball.landing||ball.z*end<=CFG.tactics.minimumNetDistance||ball.vz*end<=0)continue;
    const extension=Math.hypot(ball.x-ball.landing.x,ball.z-ball.landing.z);
    const afterBounce=ball.time-ball.landing.time;
    if(afterBounce<CFG.tactics.afterBounceTime||extension<CFG.tactics.minimumExtension||ball.y<CFG.tactics.minimumHeight||ball.y>CFG.tactics.maximumHeight)continue;
    // Stand behind and beside the ball: leave racket space on either wing.
    const stances=[{x:ball.x-CFG.tactics.stanceSide*end,z:ball.z+CFG.tactics.stanceBehind*end,backhand:false},{x:ball.x+CFG.tactics.stanceSide*end,z:ball.z+CFG.tactics.stanceBehind*end,backhand:true}];
    for(const stance of stances){
      if(!insidePlayerArea(stance))continue;
      const distance=Math.hypot(stance.x-position.x,stance.z-position.z);
      const setup=ball.time-travelTime(distance,speed,stamina);
      candidates.push({...stance,time:ball.time,ball,landing:ball.landing,distance,extension,setup,
        reachable:setup>=CFG.tactics.setupTime,waist:Math.abs(ball.y-WAIST_HEIGHT)<=CFG.tactics.waistTolerance&&extension>=CFG.tactics.waistExtension,
        score:Math.abs(ball.y-WAIST_HEIGHT)*CFG.tactics.heightWeight+distance*CFG.tactics.distanceWeight+ball.time*CFG.tactics.timeWeight+(stance.backhand?CFG.tactics.backhandPenalty:0)});
    }
  }
  if(!candidates.length)return null;
  // A reachable waist-height contact outranks an earlier low interception.
  const reachable=candidates.filter(c=>c.reachable);
  const pool=reachable.length?reachable:candidates;
  const waist=pool.filter(c=>c.waist),eligible=waist.length?waist:pool;
  // Ascending waist-height contact is preferred; late arrivals can use descent.
  const ascending=waist.filter(c=>c.ball.vy>=0);
  return (ascending.length?ascending:eligible).sort((a,b)=>a.score-b.score)[0];
}
export function recoveryPosition({end,opponentContact,strikePosition}) {
  const depth=Math.abs(strikePosition.z)<CFG.tactics.approachDepth?CFG.tactics.nearRecoveryDepth:CFG.tactics.deepRecoveryDepth,z=end*depth;
  const opponent=opponentContact||{x:0,z:-end*CFG.tactics.fallbackOpponentDepth};
  const baseline=end*CFG.court.halfLength;
  const left={x:-CFG.court.halfWidth-opponent.x,z:baseline-opponent.z},right={x:CFG.court.halfWidth-opponent.x,z:baseline-opponent.z};
  const l=Math.hypot(left.x,left.z)||1,r=Math.hypot(right.x,right.z)||1;
  const bisector={x:left.x/l+right.x/r,z:left.z/l+right.z/r};
  const x=Math.abs(bisector.z)>.001?opponent.x+(z-opponent.z)*bisector.x/bisector.z:0;
  return {x:clamp(x,-CFG.tactics.recoveryWidth,CFG.tactics.recoveryWidth),z};
}
