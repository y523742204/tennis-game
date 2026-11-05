import {chooseStance,footTargets,legAngles} from './footwork.js';
import {strokePose,splitStepPose} from './stroke-motion.js';
import {CONFIG as CFG,READY_POSE} from './config.js';
import * as THREE from './vendor/three.module.js';
const mix=THREE.MathUtils.lerp;
export function createPlayer(scene,color,z,accent) {
  const root=new THREE.Group();root.position.z=z;scene.add(root);
  const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.7});
  const shirt=mat(color),trim=mat(accent),skin=mat('#eac19b'),hair=mat('#342c27'),white=mat('#faf4df'),dark=mat('#173e32');
  function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  const sphere=(p,r,m,x,y,z)=>mesh(p,new THREE.SphereGeometry(r,20,14),m,x,y,z);
  const capsule=(p,r,length,m,x,y,z)=>mesh(p,new THREE.CapsuleGeometry(r,length,5,12),m,x,y,z);
  const body=new THREE.Group();root.add(body);
  const hips=new THREE.Group();hips.position.y=.88;body.add(hips);
  const shorts=mesh(hips,new THREE.CylinderGeometry(.28,.31,.32,16),trim,0,.05,0);shorts.scale.z=.75;
  const chest=new THREE.Group();chest.position.y=1.22;body.add(chest);
  const torso=mesh(chest,new THREE.CylinderGeometry(.31,.25,.55,20),shirt);torso.scale.z=.7;
  mesh(chest,new THREE.BoxGeometry(.43,.06,.015),trim,0,.03,-.225);
  mesh(chest,new THREE.BoxGeometry(.1,.13,.025),white,-.14,.14,-.23);
  sphere(chest,.11,skin,0,.34,0);
  const collar=mesh(chest,new THREE.TorusGeometry(.12,.025,8,24),trim,0,.29,0);collar.rotation.x=Math.PI/2;
  const head=new THREE.Group();head.position.y=1.95;body.add(head);
  const skull=sphere(head,.34,skin,0,0,0);skull.scale.set(1,1.1,.94);
  sphere(head,.075,skin,-.325,-.025,0);sphere(head,.075,skin,.325,-.025,0);
  const hairBack=sphere(head,.33,hair,0,.05,.08);hairBack.scale.set(1,.95,.8);
  // Face points towards local -Z; changing ends rotates the entire rig.
  for(const x of [-.12,.12]){const eye=sphere(head,.061,white,x,.015,-.293);eye.scale.z=.5;sphere(head,.028,dark,x,.012,-.325);sphere(head,.01,white,x-.008,.024,-.348);const brow=mesh(head,new THREE.BoxGeometry(.09,.022,.024),hair,x,.108,-.295);brow.rotation.z=x>0?-.12:.12;}
  sphere(head,.057,skin,0,-.055,-.326);
  const smile=mesh(head,new THREE.TorusGeometry(.06,.009,6,16,Math.PI*.7),dark,0,-.13,-.302);smile.rotation.z=Math.PI*1.15;
  const cap=mesh(head,new THREE.SphereGeometry(.352,24,16,0,Math.PI*2,0,Math.PI/2),trim,0,.055,0);
  const visor=sphere(head,.24,trim,0,.07,-.3);visor.scale.set(1.35,.12,1);
  mesh(head,new THREE.BoxGeometry(.1,.05,.02),white,0,.18,-.326);
  function leg(x){const hip=new THREE.Group();hip.position.set(x,.84,0);body.add(hip);capsule(hip,.105,.23,skin,0,-.18,0);const knee=new THREE.Group();knee.position.y=-.35;hip.add(knee);sphere(knee,.106,skin,0,0,0);capsule(knee,.082,.22,skin,0,-.16,0);capsule(knee,.088,.09,white,0,-.29,0);const ankle=new THREE.Group();ankle.position.y=-.43;knee.add(ankle);const shoe=capsule(ankle,.105,.14,white,0,.06,-.07);shoe.rotation.x=Math.PI/2;mesh(ankle,new THREE.BoxGeometry(.18,.045,.32),trim,0,0,-.07);return {hip,knee,ankle,foot:new THREE.Vector3(x,.06,0)}}
  const leftLeg=leg(-.16),rightLeg=leg(.16);
  function arm(x){const shoulder=new THREE.Group();shoulder.position.set(x,.18,0);chest.add(shoulder);sphere(shoulder,.14,shirt,0,-.05,0);capsule(shoulder,.093,.18,skin,0,-.19,0);const elbow=new THREE.Group();elbow.position.y=-.34;shoulder.add(elbow);sphere(elbow,.095,skin,0,0,0);capsule(elbow,.078,.19,skin,0,-.17,0);capsule(elbow,.085,.035,trim,0,-.27,0);const hand=new THREE.Group();hand.position.y=-.35;elbow.add(hand);sphere(hand,.09,skin,0,-.025,0);return {shoulder,elbow,hand}}
  const rightArm=arm(.34),leftArm=arm(-.34);
  const racket=new THREE.Group();rightArm.hand.add(racket);
  mesh(racket,new THREE.CylinderGeometry(.035,.04,.26,10),dark,0,-.15,0);
  const hoop=mesh(racket,new THREE.TorusGeometry(.3,.025,8,36),trim,0,-.5,0);hoop.scale.x=.79;
  const strings=new THREE.Group();strings.position.y=-.5;racket.add(strings);
  const stringMat=new THREE.LineBasicMaterial({color:'#e6f0d7',transparent:true,opacity:.8});
  for(let i=-3;i<=3;i++){const x=i*.055,hy=.28*Math.sqrt(1-x*x/(.22*.22));const vertical=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,-hy,0),new THREE.Vector3(x,hy,0)]),stringMat);strings.add(vertical);const y=i*.065,hx=.22*Math.sqrt(1-y*y/(.28*.28));strings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-hx,y,0),new THREE.Vector3(hx,y,0)]),stringMat));}
  const trail=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#dfef9a',transparent:true,opacity:.65}));trail.frustumCulled=false;scene.add(trail);
  root.userData.rig={body,hips,chest,head,leftLeg,rightLeg,leftArm,rightArm,racket,strings,trail,shirt,trim,trailPoints:[],swing:null,clock:0,gait:0,velocity:new THREE.Vector3(),last:root.position.clone()};
  return root;
}
export function applyPlayerStyle(player,{colors=['#47734a','#d3df91'],build=1}={}){
  const rig=player.userData.rig;rig.shirt.color.set(colors[0]);rig.trim.color.set(colors[1]);
  rig.body.scale.set(build,1+(build-1)*.22,build);rig.trail.material.color.set(colors[1]);
}
const READY=READY_POSE;
export function beginStroke(player,{type='flat',backhand=false,serve=false,pad={x:0,y:0}}={}){
  const rig=player.userData.rig;rig.swing={type,backhand,serve,pad,stance:chooseStance({type,backhand,serve,lateral:rig.velocity.x}),time:0,duration:serve?CFG.animation.serveDuration:CFG.animation.strokeDuration,contact:serve?CFG.animation.serveContact:CFG.animation.contact,hit:false};rig.trailPoints=[];
}
export function updatePlayer(player,dt,{end=1,moving=false,serveReady=false,ready=false,paused=false}={}){
  if(paused){player.userData.rig.last.copy(player.position);return false}
  const r=player.userData.rig;r.clock+=paused?0:dt;
  let split={lift:0,bend:0,width:0};
  if(r.splitStep!=null){r.splitStep+=dt;split=splitStepPose(r.splitStep);if(r.splitStep>=CFG.animation.splitDuration)r.splitStep=null}
  const displacement=player.position.clone().sub(r.last);r.last.copy(player.position);
  const targetVelocity=moving&&dt>0&&displacement.length()<CFG.animation.teleportDistance?displacement.clone().divideScalar(dt):new THREE.Vector3();
  r.velocity.lerp(targetVelocity,1-Math.exp(-dt*CFG.animation.velocityDamping));
  const speed=r.velocity.length(),stride=THREE.MathUtils.clamp(speed/CFG.animation.fullStrideSpeed,0,1),running=stride>CFG.animation.runningThreshold;
  const lateral=THREE.MathUtils.clamp(r.velocity.x*end/CFG.animation.fullStrideSpeed,-1,1),forward=THREE.MathUtils.clamp(-r.velocity.z*end/CFG.animation.fullStrideSpeed,-1,1);
  if(displacement.length()<CFG.animation.teleportDistance)r.gait+=displacement.length()/Math.max(.1,CFG.animation.stepLength*(.45+.55*stride))*Math.PI*2;
  player.rotation.y=end===1?0:Math.PI;
  let p={...READY},contact=false,s=r.swing;
  if(s&&!paused){s.time+=dt;const u=Math.min(s.time/s.duration,1);p=strokePose(s.type,s.backhand,s.serve,u,s.pad);
    if(!s.hit&&u>=s.contact){s.hit=true;contact=true}
    if(u>=1)r.swing=null;
  }else if(s){p=strokePose(s.type,s.backhand,s.serve,Math.min(s.time/s.duration,1),s.pad)}
  else if(serveReady){p={...READY,right:[.3,-.5,-.45],left:[1.15,0,.15],elbowR:1.4,elbowL:.1,yaw:-.25,bend:.16}}
  const gait=Math.sin(r.gait)*stride*(s?CFG.animation.strideDuringStroke:1),hop=(1-Math.cos(r.gait*2))*CFG.animation.hop*stride+Math.sin(r.clock*2)*CFG.animation.idleHop*(1-stride);
  if(running&&!s){p={...p,right:[1.0+gait*.5,-.15,-.3],left:[.8-gait*.5,.15,.3],pitch:.16,yaw:gait*.08}}
  const damp=1-Math.exp(-dt*(s?CFG.animation.strokeDamping:CFG.animation.jointDamping)),rot=(object,values)=>{for(let i=0;i<3;i++){const axis=['x','y','z'][i];object.rotation[axis]=mix(object.rotation[axis],values[i],damp)}};
  r.body.position.y=mix(r.body.position.y,hop-(p.bend||0)*.14+(p.lift||0)+split.lift-split.bend*.14,damp);
  r.body.position.x=mix(r.body.position.x,(p.weight||0)+gait*.018,damp);
  r.body.position.z=mix(r.body.position.z,-(p.transfer||0)*CFG.animation.weightDepth,damp);
  rot(r.body,[forward*.07,0,-lateral*.1+gait*.025+(p.roll||0)]);
  rot(r.hips,[0,(p.hipYaw||0)-gait*.06,0]);
  rot(r.chest,[p.pitch||0,p.yaw||0,0]);r.head.rotation.y=mix(r.head.rotation.y,-(p.yaw||0)*(s&&s.time/s.duration<s.contact+CFG.animation.contactHold?1:.5),damp);
  rot(r.rightArm.shoulder,p.right);rot(r.leftArm.shoulder,p.left);rot(r.rightArm.hand,p.wrist||[0,0,0]);
  r.rightArm.elbow.rotation.x=mix(r.rightArm.elbow.rotation.x,p.elbowR,damp);r.leftArm.elbow.rotation.x=mix(r.leftArm.elbow.rotation.x,p.elbowL,damp);
  const u=s?Math.min(s.time/s.duration,1):0;
  const setup=s?Math.min(u/CFG.animation.coil,1)*Math.min((1-u)/(1-CFG.animation.recover),1):0;
  const stanceAmount=Math.max(0,setup)*(1-stride*CFG.animation.strideDuringStroke);
  const feet=footTargets({phase:r.gait,speed,vx:r.velocity.x*end,vz:r.velocity.z*end,stance:s?.stance,amount:stanceAmount,backhand:s?.backhand,split:split.width,progress:s?u:null});
  for(const [i,leg] of [r.leftLeg,r.rightLeg].entries()){
    const foot=feet[i],sign=i===0?-1:1;
    leg.hip.position.set(sign*.16,.84,0);
    const target=new THREE.Vector3(foot.x,.06+foot.lift+split.lift+(p.lift||0),foot.z);
    leg.foot.lerp(target,1-Math.exp(-dt*CFG.animation.footDamping));
    const angles=legAngles(leg.foot.x-leg.hip.position.x-r.body.position.x,leg.foot.y-.84-r.body.position.y,leg.foot.z-r.body.position.z);
    rot(leg.hip,[angles.hip,0,angles.roll]);rot(leg.knee,[angles.knee,0,0]);
    rot(leg.ankle,[angles.ankle,foot.yaw,-angles.roll]);
    // 关闭式转脚曲线自身已平滑；额外阻尼会让上一只脚的转动拖到下一只脚落地。
    if(s?.stance==='closed')leg.ankle.rotation.y=foot.yaw;
  }
  const progress=s?s.time/s.duration:0;
  r.trail.visible=!!s&&progress>(s.serve?CFG.animation.serveTrailStart:CFG.animation.strokeTrailStart)&&progress<(s.serve?CFG.animation.serveTrailEnd:CFG.animation.strokeTrailEnd);
  if(r.trail.visible&&!paused){player.updateMatrixWorld(true);const point=new THREE.Vector3();r.strings.getWorldPosition(point);r.trailPoints.push(point);if(r.trailPoints.length>CFG.animation.trailPoints)r.trailPoints.shift();r.trail.geometry.dispose();r.trail.geometry=new THREE.BufferGeometry().setFromPoints(r.trailPoints);r.trail.material.color.set(s.type==='top'?'#e5ed8e':s.type==='slice'?'#a4e9ed':'#fff1d6')}
  return contact;
}
export function strokeProgress(player){const s=player.userData.rig.swing;return s?Math.min(s.time/s.duration,1):null}
