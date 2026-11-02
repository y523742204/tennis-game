import {CONFIG as CFG} from './config.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
// 显示与真实体力独立：回合结束真实值立即补满，视觉值仍按时间追赶。
export function staminaDisplay(displayed,trailing,target,cap,dt){
  const s=CFG.stamina,falling=displayed>target;
  displayed+=(target-displayed)*(1-Math.exp(-Math.max(0,dt)*(falling?s.displayFallRate:s.displayRiseRate)));
  if(Math.abs(target-displayed)<s.displaySnap)displayed=target;
  displayed=clamp(displayed,0,cap);
  trailing+=(displayed-trailing)*(1-Math.exp(-Math.max(0,dt)*s.displayTrailRate));
  trailing=clamp(trailing,0,cap);
  return {displayed,trailing,fill:displayed/s.full,trail:Math.max(displayed,trailing)/s.full,deadZone:1-cap/s.full};
}
export class Stamina {
  constructor(){this.reset()}
  reset(){this.values=[CFG.stamina.full,CFG.stamina.full];this.caps=[CFG.stamina.full,CFG.stamina.full];this.exhausted=[false,false]}
  spend(who,amount){
    this.values[who]=Math.max(0,this.values[who]-Math.max(0,amount));
    if(this.values[who]===0)this.exhausted[who]=true;
  }
  recover(dt){for(let i=0;i<2;i++)this.values[i]=Math.min(this.caps[i],this.values[i]+Math.max(0,dt)*CFG.stamina.recoveryPerSecond)}
  finishPoint(game=false){
    for(let i=0;i<2;i++){
      if(game)this.caps[i]=CFG.stamina.full;
      else if(this.exhausted[i])this.caps[i]*=CFG.stamina.capRetention;
      this.values[i]=this.caps[i];this.exhausted[i]=false;
    }
  }
}
export function staminaEffects(value){
  const energy=clamp(value,0,CFG.stamina.full),fatigue=1-clamp(energy/CFG.stamina.lowThreshold,0,1);
  return {movement:CFG.stamina.minimumMoveMultiplier+(1-CFG.stamina.minimumMoveMultiplier)*energy/CFG.stamina.full,pace:1-CFG.stamina.maximumPaceLoss*fatigue,scatter:CFG.stamina.maximumScatter*fatigue**CFG.stamina.scatterExponent};
}
export function fatigueTarget(target,value,random=Math.random){
  const radius=Math.sqrt(random())*staminaEffects(value).scatter,angle=random()*Math.PI*2;
  return {x:target.x+Math.cos(angle)*radius,z:target.z+Math.sin(angle)*radius};
}
