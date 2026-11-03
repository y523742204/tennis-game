import {CONFIG as CFG,READY_POSE,strokePoses,servePoses} from './config.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// 单调三次 Hermite：通过触球帧时不断速，不在每个姿态处停顿，也不越过关节关键角度。
function curve(values,times,i,t){
 const slope=k=>(values[k+1]-values[k])/(times[k+1]-times[k]);
 const tangent=k=>{
  if(k===0||k===values.length-1)return 0;
  const a=slope(k-1),b=slope(k);return a*b<=0?0:2*a*b/(a+b);
 };
 const d=times[i+1]-times[i],a=values[i],b=values[i+1],m=tangent(i)*d,n=tangent(i+1)*d;
 return (2*t*t*t-3*t*t+1)*a+(t*t*t-2*t*t+t)*m+(-2*t*t*t+3*t*t)*b+(t*t*t-t*t)*n;
}
export function sampleFrames(frames,u){
 u=clamp(u,0,1);let i=0;while(i<frames.length-2&&u>frames[i+1][0])i++;
 const times=frames.map(f=>f[0]),t=(u-times[i])/(times[i+1]-times[i]);
 const keys=new Set(frames.flatMap(f=>Object.keys(f[1]))),result={};
 for(const key of keys){
  const shape=frames.find(f=>Array.isArray(f[1][key]))?.[1][key];
  if(shape)result[key]=shape.map((_,j)=>curve(frames.map(f=>f[1][key]?.[j]??0),times,i,t));
  else result[key]=curve(frames.map(f=>f[1][key]??0),times,i,t);
 }
 return result;
}
export function strokePose(type,backhand,serve,u,pad={x:0,y:0}){
 const a=CFG.animation,R=READY_POSE;
 if(serve){
  // 抛球/屈膝 -> 奖杯姿势 -> 肘部领先、拍头下沉 -> 向上伸展 -> 前臂旋转与跨身随挥。
  const {toss,trophy,drop,hit,finish}=servePoses(pad);
  return sampleFrames([[0,R],[a.serveToss,toss],[a.serveTrophy,trophy],[a.serveDrop,drop],[a.serveContact,hit],[a.serveFinish,finish],[1,R]],u);
 }
 const {coil,drive,contactPose,finish}=strokePoses(type,backhand);
 return sampleFrames([[0,R],[a.coil,coil],[a.drive,drive],[a.contact,contactPose],[a.finish,finish],[a.recover,{...finish,bend:.16}],[1,R]],u);
}
export function splitStepPose(time){
 const a=CFG.animation,u=clamp(time/a.splitDuration,0,1);
 return {lift:a.splitHeight*Math.sin(Math.PI*Math.min(u/.7,1)),bend:a.splitBend*Math.sin(Math.PI*clamp((u-.4)/.6,0,1))**2,width:a.splitWidth*Math.sin(Math.PI*u)};
}
export function serveTossHeight(u){
 const a=CFG.animation,base=1.3,hit=CFG.shot.serveContactHeight,peak=hit+a.serveTossExtra;
 if(u<=a.serveTossPeak){const t=clamp(u/a.serveTossPeak,0,1);return base+(peak-base)*(2*t-t*t)}
 const t=clamp((u-a.serveTossPeak)/(a.serveContact-a.serveTossPeak),0,1);
 return peak-(peak-hit)*t*t;
}
