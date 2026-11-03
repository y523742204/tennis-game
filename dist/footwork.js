import {CONFIG as CFG} from './config.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function chooseStance({type='flat',backhand=false,serve=false,lateral=0}={}){
 if(serve||type==='smash')return 'closed';
 if(Math.abs(lateral)>=CFG.animation.openLateralSpeed)return 'open';
 return backhand||type==='slice'||type==='volley'?'closed':'open';
}
export function closedFootPlacement(progress,front){
 const a=CFG.animation,u=clamp(progress,0,1),half=a.coil/2;
 const start=front?half:0,end=start+half;
 const recoveryHalf=(1-a.recover)/2,recoverStart=a.recover+(front?recoveryHalf:0);
 const smooth=t=>t*t*(3-2*t);
 const enter=clamp((u-start)/(end-start),0,1),leave=clamp((u-recoverStart)/recoveryHalf,0,1);
 return {amount:smooth(enter)*(1-smooth(leave)),lift:a.closedStepLift*(Math.sin(Math.PI*enter)+Math.sin(Math.PI*leave))};
}
export function footTargets({phase=0,speed=0,vx=0,vz=0,stance='open',amount=0,backhand=false,split=0,progress=null}={}){
 const a=CFG.animation,stride=clamp(speed/a.fullStrideSpeed,0,1),length=a.stepLength*(.45+.55*stride);
 const lateral=Math.abs(vx)>Math.abs(vz)*1.2,lift=lateral?a.shuffleLift:a.stepLift;
 const norm=Math.hypot(vx,vz)||1,dir={x:vx/norm,z:vz/norm},closed=stance==='closed',side=backhand?-1:1;
 return [-1,1].map((sign,i)=>{
  const u=((phase/(Math.PI*2)+i*.5)%1+1)%1,plant=a.footPlantRatio;
  const swing=clamp((u-plant)/(1-plant),0,1),smooth=swing*swing*(3-2*swing);
  const offset=u<plant?length*(plant/2-u):length*plant*(smooth-.5);
  const front=sign*side<0,placement=closed&&progress!==null?closedFootPlacement(progress,front):{amount,lift:0};
  const set=placement.amount,run=1-set,stanceWidth=closed?a.closedWidth:a.openWidth;
  const x=sign*(.16+set*(stanceWidth-.16)+split)+dir.x*offset*stride*run;
  return {x:lateral?sign*Math.max(.09,sign*x):x,
   z:dir.z*offset*stride*run+(closed?sign*side*a.closedDepth*set:0),
   lift:Math.sin(Math.PI*swing)*lift*stride*run+placement.lift,
   yaw:set*(closed?side*(front?a.closedFrontYaw:a.closedRearYaw):sign*.22),planted:u<plant&&placement.lift<1e-6};
 });
}
// 两段腿长保持不变，膝盖向前弯曲；脚踝反向补偿，避免鞋底跟着小腿翻转。
export function legAngles(dx,dy,dz){
 const upper=.35,lower=.43,d=clamp(Math.hypot(dx,dy,dz),.12,upper+lower-.001);
 const alpha=Math.acos(clamp((upper*upper+d*d-lower*lower)/(2*upper*d),-1,1));
 const knee=Math.PI-Math.acos(clamp((upper*upper+lower*lower-d*d)/(2*upper*lower),-1,1));
 const hip=Math.atan2(-dz,-dy)+alpha;
 return {hip,knee:-knee,roll:Math.atan2(dx,Math.hypot(dy,dz)),ankle:knee-hip};
}
