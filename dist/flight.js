import {CONFIG as CFG} from './config.js';
export const PHYSICS_STEP=CFG.physics.step;
export function servePad(x,y) {
  y=Math.max(0,y);
  const length=Math.hypot(x,y),scale=length>1?1/length:1;
  x*=scale;y*=scale;
  if(Math.hypot(x,y)<CFG.input.serveDeadZone)return {x:0,y:0};
  return {x,y};
}
export function spinVector(type,velocity,pad=null) {
  const speed=Math.hypot(velocity.x,velocity.z)||1;
  const top=pad?pad.y*CFG.physics.serveTopSpin:type==='top'?CFG.physics.topSpin:type==='slice'?CFG.physics.sliceSpin:0;
  return {x:velocity.z/speed*top,y:pad?-pad.x*CFG.physics.serveSideSpin:0,z:-velocity.x/speed*top};
}
export function aerodynamicForce(v,w) {
  const drag=-CFG.physics.drag*Math.hypot(v.x,v.y,v.z),magnus=CFG.physics.magnus;
  return {
    x:v.x*drag+(w.y*v.z-w.z*v.y)*magnus,
    y:v.y*drag+(w.z*v.x-w.x*v.z)*magnus,
    z:v.z*drag+(w.x*v.y-w.y*v.x)*magnus
  };
}
