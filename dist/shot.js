import {CONFIG as CFG} from './config.js';
import {PHYSICS_STEP,aerodynamicForce,spinVector} from './flight.js';
import {staminaEffects} from './stamina.js';

export const speedKmh=v=>Math.hypot(v.x,v.y,v.z)*3.6;
export function desiredSpeedKmh(type,power,perfect=false,pad=null,stamina=CFG.stamina.full){
  const s=CFG.shot,base=pad?s.serveSpeedKmh-pad.y*s.serveTopLossKmh-Math.abs(pad.x)*s.serveSideLossKmh:s.speedKmh[type];
  return base*Math.max(.1,1+(power-s.neutralPower)*s.powerSpeedFactor)*staminaEffects(stamina).pace*(perfect?s.perfectSpeed:1);
}

// 与 cannon-es 的无碰撞自由飞行保持相同固定步长和半隐式 Euler 顺序。
// 射击求解不包含碰撞；最终预览与比赛仍使用带球网/地面的 cannon-es 世界。
export function freeFlight(origin,velocity,spin,time){
  const p={...origin},v={...velocity},w={...spin};
  const steps=Math.max(1,Math.round(time/PHYSICS_STEP)),dt=PHYSICS_STEP;
  const damping=Math.pow(1-CFG.physics.angularDamping,dt);
  let netHeight=null;
  for(let i=0;i<steps;i++){
    const oldZ=p.z,oldY=p.y,f=aerodynamicForce(v,w);
    v.x+=f.x/CFG.physics.ballMass*dt;v.y+=(f.y/CFG.physics.ballMass-CFG.physics.gravity)*dt;v.z+=f.z/CFG.physics.ballMass*dt;
    for(const axis of ['x','y','z']){p[axis]+=v[axis]*dt;w[axis]*=damping}
    if(netHeight===null&&oldZ*p.z<=0&&oldZ!==p.z)netHeight=oldY+(p.y-oldY)*(-oldZ)/(p.z-oldZ);
  }
  return {position:p,velocity:v,netHeight};
}

export function solveShot(origin,target,type,power,perfect=false,pad=null,stamina=CFG.stamina.full){
  const s=CFG.shot,desired=desiredSpeedKmh(type,power,perfect,pad,stamina);
  const dx=target.x-origin.x,dz=target.z-origin.z,distance=Math.hypot(dx,dz);
  function atTime(time){
    time=Math.max(PHYSICS_STEP,Math.round(time/PHYSICS_STEP)*PHYSICS_STEP);
    const v={x:dx/time,y:(s.landingHeight-origin.y+CFG.physics.gravity*.5*time*time)/time,z:dz/time};
    let spin,result;
    for(let pass=0;pass<s.solverPasses;pass++){
      spin=spinVector(type,v,pad);
      if(perfect&&!pad&&type!=='slice'){
        const horizontal=Math.hypot(v.x,v.z)||1;
        spin.x+=v.z/horizontal*s.perfectDipSpin;spin.z-=v.x/horizontal*s.perfectDipSpin;
      }
      result=freeFlight(origin,v,spin,time);
      if(pass<s.solverPasses-1){v.x+=(target.x-result.position.x)/time;v.y+=(s.landingHeight-result.position.y)/time;v.z+=(target.z-result.position.z)/time}
    }
    return {v,spin,time,netHeight:result.netHeight,landing:result.position,speedKmh:speedKmh(v)};
  }
  let time=Math.min(s.maximumFlightTime,Math.max(s.minimumFlightTime,distance/(desired/3.6))),shot;
  for(let i=0;i<s.speedPasses;i++){
    shot=atTime(time);
    time=Math.min(s.maximumFlightTime,Math.max(s.minimumFlightTime,shot.time*shot.speedKmh/desired));
  }
  // 高速低球/浅球可能无法同时满足速度、过网与落点，优先过网及目标，绝不伪造测速数字。
  const clearance=s.netTop+CFG.physics.ballRadius+s.netClearance;
  if(shot.netHeight!==null&&shot.netHeight<clearance){
    let low=shot.time,high=s.maximumFlightTime,best=atTime(high);
    for(let i=0;i<s.speedPasses+4;i++){
      const candidate=atTime((low+high)/2);
      if(candidate.netHeight>=clearance){high=candidate.time;best=candidate}else low=candidate.time;
    }
    shot=best;
  }
  return shot;
}
