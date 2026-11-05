import {CONFIG as CFG} from './config.js';
// 误差在理想轨迹求解之后加入，球速不变；由真实碰撞/落点决定发球是否成功。
export function serveVelocityError(velocity,{serving=false,attempt=1,type='flat',pad=null,power=65,perfect=false}={},random=Math.random){
  const s=CFG.shot;
  if(!serving||attempt!==1||type!=='flat'||(pad?.y||0)>=s.flatServeSpinThreshold)return {...velocity};
  const factor=(1+Math.max(0,power-s.neutralPower)*s.serveErrorPowerFactor)*(perfect?s.perfectServeErrorMultiplier:1)*(1-Math.min(1,Math.abs(pad?.x||0))*s.serveSpinErrorReduction);
  const yaw=(random()*2-1)*s.flatFirstServeYaw*Math.PI/180*factor;
  const pitch=(random()*2-1)*s.flatFirstServePitch*Math.PI/180*factor;
  const speed=Math.hypot(velocity.x,velocity.y,velocity.z),horizontal=Math.hypot(velocity.x,velocity.z);
  const heading=Math.atan2(velocity.x,velocity.z)+yaw,elevation=Math.atan2(velocity.y,horizontal)+pitch;
  return {x:Math.sin(heading)*Math.cos(elevation)*speed,y:Math.sin(elevation)*speed,z:Math.cos(heading)*Math.cos(elevation)*speed};
}
export function netShotTargetError(target,type,incomingVelocity,random=Math.random){
  if(!['volley','smash'].includes(type))return {...target};
  const s=CFG.shot,pace=Math.hypot(incomingVelocity.x||0,incomingVelocity.y||0,incomingVelocity.z||0);
  const radius=Math.min(s.netPaceScatterMax,Math.max(0,pace-s.netPaceThreshold)*s.netPaceScatterPerSpeed)*Math.sqrt(random());
  const angle=random()*Math.PI*2;
  return {x:target.x+Math.cos(angle)*radius,z:target.z+Math.sin(angle)*radius};
}
