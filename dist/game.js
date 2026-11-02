import {courtDimensions,clampPlayerTarget} from './court.js';
import {serveVelocityError} from './accuracy.js';
import {solveShot,speedKmh} from './shot.js';
import {TennisAudio} from './audio.js';
import {CONFIG as CFG} from './config.js';
import {viewportLayout,fitCourtCamera,gesturePlacement,gesturePowerPlacement,directionShot} from './viewport.js';
import {Stamina,staminaEffects,fatigueTarget,staminaDisplay} from './stamina.js';
import {ReturnStrategy} from './return-strategy.js';
import {selectContact,recoveryPosition} from './tactics.js';
import {createPlayer,beginStroke,updatePlayer,strokeProgress} from './player.js';
import {servePad,aerodynamicForce,PHYSICS_STEP,flightTimeScale} from './flight.js';
import {TennisMatch,validServiceLanding} from './rules.js';
import * as C from './vendor/cannon-es.js';
import * as THREE from './vendor/three.module.js';
const arena=document.querySelector('#arena'),message=document.querySelector('#announcement');
const scene=new THREE.Scene();scene.background=new THREE.Color(CFG.view.background);scene.fog=new THREE.Fog(CFG.view.background,27,65);
const camera=new THREE.PerspectiveCamera(CFG.view.fieldOfView,1,.1,100);camera.position.set(0,20,27);camera.lookAt(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,CFG.view.desktopPixelRatio));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=CFG.view.exposure;arena.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xf5ffe2,0x34523e,2.5));const sun=new THREE.DirectionalLight(0xfff4d4,3);sun.position.set(-10,20,8);sun.castShadow=true;sun.shadow.normalBias=.025;sun.shadow.radius=4;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:18,bottom:-18});scene.add(sun);
function box(w,h,d,color,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.85}));mesh.position.set(x,y,z);mesh.receiveShadow=true;scene.add(mesh);return mesh}
const courtSize=courtDimensions(),court=CFG.court;
box(courtSize.width,.3,courtSize.length,court.bufferColor,0,-.25);
box(courtSize.width,.02,courtSize.length,court.bufferColor,0,-.08);
const stripeDepth=court.halfLength*2/12;
for(let i=0;i<12;i++)box(court.doublesHalfWidth*2,.02,stripeDepth,court.grassColors[i%2],0,-.08,-court.halfLength+(i+.5)*stripeDepth);
function line(x,z,w,d){box(w,.025,d,'#e8ebcd',x,-.045,z)}
for(const x of [-court.doublesHalfWidth,-court.halfWidth,court.halfWidth,court.doublesHalfWidth])line(x,0,court.lineWidth,court.halfLength*2);
for(const z of [-court.halfLength,court.halfLength]){line(0,z,court.doublesHalfWidth*2,court.lineWidth);line(0,z-Math.sign(z)*.1,court.lineWidth,.2)}
for(const z of [-court.serviceDepth,court.serviceDepth])line(0,z,court.halfWidth*2,court.lineWidth);
line(0,0,court.lineWidth,court.serviceDepth*2);
// 外缘为深绿色边沿，完整保留标准跑动缓冲区。
for(const x of [-courtSize.halfWidth,courtSize.halfWidth])box(.1,.08,courtSize.length,'#284a36',x,-.02);
for(const z of [-courtSize.halfLength,courtSize.halfLength])box(courtSize.width,.08,.1,'#284a36',0,-.02,z);
const netHalfWidth=court.doublesHalfWidth+.914;
for(let i=0;i<=40;i++)box(.018,1.05,.018,'#c9d1bd',-netHalfWidth+i*netHalfWidth*2/40,.5,0);
for(let i=0;i<8;i++)box(netHalfWidth*2,.018,.018,'#a5b69c',0,i*.14,0);
box(netHalfWidth*2,.08,.06,'#f4f0d8',0,1.1);for(const x of [-netHalfWidth,netHalfWidth])box(.12,1.4,.12,'#dde2ca',x,.6);
const human=createPlayer(scene,CFG.view.humanColor,10.5,CFG.view.humanAccent),cpu=createPlayer(scene,CFG.view.cpuColor,-10.5,CFG.view.cpuAccent);const ball=new THREE.Mesh(new THREE.SphereGeometry(CFG.physics.ballRadius,16,16),new THREE.MeshStandardMaterial({color:'#e2f76a',emissive:'#687a16',emissiveIntensity:.3}));ball.castShadow=true;scene.add(ball);for(const axis of [0,Math.PI/2]){const seam=new THREE.Mesh(new THREE.TorusGeometry(CFG.physics.ballRadius+.001,.006,5,36),new THREE.MeshStandardMaterial({color:'#fbffe5',roughness:.8}));seam.rotation.x=axis;ball.add(seam);}
const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=256;const ctx=textureCanvas.getContext('2d');ctx.fillStyle='#eee';ctx.fillRect(0,0,256,256);for(let i=0;i<8000;i++){const shade=170+Math.random()*80;ctx.fillStyle='rgb('+shade+','+shade+','+shade+')';ctx.fillRect(Math.random()*256,Math.random()*256,1,3)}const grassTexture=new THREE.CanvasTexture(textureCanvas);grassTexture.wrapS=grassTexture.wrapT=THREE.RepeatWrapping;grassTexture.repeat.set(5,2);grassTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();scene.traverse(o=>{if(o.isMesh&&o.position.y===-.08){o.material.map=grassTexture;o.material.bumpMap=grassTexture;o.material.bumpScale=.03}});
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.26,24),new THREE.MeshBasicMaterial({color:'#112c1a',transparent:true,opacity:.25,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
const world=new C.World({gravity:new C.Vec3(0,-CFG.physics.gravity,0)});world.solver.iterations=CFG.physics.solverIterations;
const felt=new C.Material(),grass=new C.Material(),netMat=new C.Material();
world.addContactMaterial(new C.ContactMaterial(felt,grass,{friction:CFG.physics.grassFriction,restitution:CFG.physics.grassRestitution}));world.addContactMaterial(new C.ContactMaterial(felt,netMat,{friction:CFG.physics.netFriction,restitution:CFG.physics.netRestitution}));
const floor=new C.Body({mass:0,material:grass,shape:new C.Plane()});floor.quaternion.setFromEuler(-Math.PI/2,0,0);floor.position.y=-.06;world.addBody(floor);
const netBody=new C.Body({mass:0,material:netMat,shape:new C.Box(new C.Vec3(netHalfWidth,.55,.035)),position:new C.Vec3(0,.5,0)});world.addBody(netBody);
const physicalBall=new C.Body({mass:CFG.physics.ballMass,material:felt,shape:new C.Sphere(CFG.physics.ballRadius),linearDamping:0,angularDamping:CFG.physics.angularDamping});world.addBody(physicalBall);


const $=id=>document.getElementById(id),players=[human,cpu];
const energy=new Stamina();
const sounds=new TennisAudio();
let match=new TennisMatch(),difficulty=CFG.match.difficulty,phase='menu',started=false,paused=false,stamina=energy.values,ends=[1,-1];
let lastHitter=0,bounces=0,decision=null,isServe=true,serveAttempt=1,netTouched=false,flightIsServe=true;
let plan=null,elapsed=0,acc=0,aiWait=0,turn=1,aim={x:-2,z:-4},selected='top',gauge=.5,dirty=true,hold=null;
const wheel=$('wheel'),canvas=renderer.domElement;
let screenLayout=null,previousViewport=null;
function readSafeArea(){const style=getComputedStyle(document.documentElement);return Object.fromEntries(['top','right','bottom','left'].map(side=>[side,parseFloat(style.getPropertyValue('--safe-'+side))||0]))}
function resizeCourt(){
 const width=arena.clientWidth,height=arena.clientHeight,coarse=matchMedia('(pointer:coarse)').matches;
 screenLayout=viewportLayout(width,height,readSafeArea(),coarse);
 const orientationChanged=previousViewport&&(width>height)!==(previousViewport.width>previousViewport.height);
 if(orientationChanged){cancelHold();if(started&&$('startMenu').hidden){paused=true;say('画面已旋转 · 轻触球场继续');ui()}}
 else if(previousViewport&&Math.abs(width-previousViewport.width)>2)cancelHold();
 previousViewport={width,height};
 renderer.setPixelRatio(Math.min(devicePixelRatio,screenLayout.mobile?CFG.view.mobilePixelRatio:CFG.view.desktopPixelRatio));renderer.setSize(width,height);fitCourtCamera(camera,screenLayout,ends[0]);
 const viewDistance=camera.position.length();scene.fog.near=Math.max(27,viewDistance-8);scene.fog.far=viewDistance+80;
 const shadowSize=screenLayout.mobile?CFG.view.mobileShadowSize:CFG.view.desktopShadowSize;
 if(sun.shadow.mapSize.x!==shadowSize){sun.shadow.mapSize.set(shadowSize,shadowSize);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}renderer.shadowMap.needsUpdate=true}
 if(hold?.ready)placeCurrentGesture();dirty=true;
}
function placeCurrentGesture(){
 if(!hold||!screenLayout)return;
 const kind=hold.mode==='serve'?'serve':'rally',p=gesturePlacement(screenLayout,hold.x,hold.y,kind),element=kind==='serve'?$('serveDial'):wheel;
 element.style.left=p.left+'px';element.style.top=p.top+'px';element.style.transform='scale('+p.scale+')';element.style.transformOrigin='top left';
 const power=gesturePowerPlacement(screenLayout,p),panel=$('powerPanel');
 panel.style.left=power.left+'px';panel.style.top=power.top+'px';panel.style.width=CFG.layout.gesturePowerWidth+'px';panel.style.height=CFG.layout.gesturePowerHeight+'px';panel.style.transform='scale('+power.scale+')';
 if(kind==='serve')hold.radius=82*p.scale;else hold.origin={x:p.left+145*p.scale,y:p.top+140*p.scale};
}

let serveSpin={x:0,y:0},pendingStroke=null,lastPreviewTime=0;
let recoveryTargets=[null,null],recoveryDelay=[0,0];
const returnStrategy=new ReturnStrategy();
let rallyWindup=null,retiredPointerId=null,ignoreNextClick=false;
function incomingReturn(){return phase==='flight'&&lastHitter===1&&plan?.receiver===0&&returnStrategy.active}
function choosingReturn(){return phase==='flight'&&returnStrategy.active}
function servingInput(){return phase==='choose'&&isServe&&match.server===0}
function currentReturnChoice(now=performance.now()){
 const charging=hold?.ready&&hold.mode==='rally',value=charging?(1-Math.cos((now-hold.chargeStart)*CFG.input.chargeRate))/2:.5;
 return {type:selected,power:charging?Math.round(CFG.input.minimumPower+value*CFG.input.powerRange):CFG.shot.neutralPower,perfect:charging&&Math.abs(value-CFG.input.perfectCenter)<=CFG.input.perfectHalfWidth,gauge:value,target:{...aim}};
}
function clearReturn(){returnStrategy.close();rallyWindup=null;}

let displayedStamina=[CFG.stamina.full,CFG.stamina.full],trailingStamina=[CFG.stamina.full,CFG.stamina.full];
const energyViews=players.map((_,i)=>({root:$('playerEnergy'+i),meter:$('energy'+i),label:$('value'+i),fill:$('energy'+i).querySelector('.energy-fill'),trail:$('energy'+i).querySelector('.energy-trail')}));
const feetPosition=new THREE.Vector3();
function updatePlayerEnergy(dt){
 camera.updateMatrixWorld();
 for(let i=0;i<2;i++){
  const view=energyViews[i],target=stamina[i],falling=displayedStamina[i]>target;
  // Ease the displayed gauge in real time; gameplay always uses the true stamina.
  const display=staminaDisplay(displayedStamina[i],trailingStamina[i],target,energy.caps[i],dt);
  displayedStamina[i]=display.displayed;trailingStamina[i]=display.trailing;
  feetPosition.copy(players[i].position);feetPosition.y=0;feetPosition.project(camera);
  const visible=started&&$('startMenu').hidden&&$('sideMenu').hidden&&Math.abs(feetPosition.x)<1&&Math.abs(feetPosition.y)<1&&feetPosition.z>-1&&feetPosition.z<1;
  view.root.hidden=!visible;
  if(visible){view.root.style.left=((feetPosition.x*.5+.5)*arena.clientWidth)+'px';view.root.style.top=((-feetPosition.y*.5+.5)*arena.clientHeight+CFG.view.energyOffset)+'px'}
  const cap=energy.caps[i],{fill,trail}=display;
  view.meter.style.background=`linear-gradient(to right,${CFG.stamina.trackColor} ${cap/CFG.stamina.full*100}%,${CFG.stamina.deadZoneColor} ${cap/CFG.stamina.full*100}%)`;
  view.root.style.minWidth=CFG.view.energyWidth+'px';
  view.fill.style.transform='scaleX('+fill+')';view.trail.style.transform='scaleX('+trail+')';
  view.root.classList.toggle('low',target<CFG.stamina.lowColor);view.root.classList.toggle('tired',target>=CFG.stamina.lowColor&&target<CFG.stamina.tiredColor);
  view.root.classList.toggle('draining',falling&&displayedStamina[i]-target>.3);
  view.label.textContent=Math.round(displayedStamina[i])+'/'+CFG.stamina.full;view.meter.setAttribute('aria-valuenow',String(Math.round(target)));
  view.meter.setAttribute('aria-valuemax',String(CFG.stamina.full));
  view.meter.setAttribute('aria-valuetext',`体力 ${Math.round(target)}，上限 ${Math.round(energy.caps[i])}${energy.exhausted[i]?`，下回合上限降低 ${Math.round((1-CFG.stamina.capRetention)*100)}%`:''}`);
  view.root.title=energy.exhausted[i]?`本回合体力已耗尽，下回合上限降低 ${Math.round((1-CFG.stamina.capRetention)*100)}%`:`每秒恢复 ${CFG.stamina.recoveryPerSecond} 点；每分结束补满，灰色为不可恢复容量`;
 }
}
const aimLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#f5eda5',dashSize:.25,gapSize:.15}));scene.add(aimLine);
const marker=new THREE.Mesh(new THREE.RingGeometry(.28,.4,32),new THREE.MeshBasicMaterial({color:'#eff69d',side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.y=.015;scene.add(marker);
// Cyan ghost marks the actual post-bounce contact, separate from the landing ring.
const contactGuide=new THREE.Group();scene.add(contactGuide);contactGuide.visible=false;
const contactHalo=new THREE.Mesh(new THREE.RingGeometry(.23,.3,28),new THREE.MeshBasicMaterial({color:'#a8e5e1',transparent:true,opacity:.7,side:THREE.DoubleSide}));contactHalo.rotation.x=-Math.PI/2;contactHalo.position.y=.018;contactGuide.add(contactHalo);
const contactGhost=new THREE.Mesh(new THREE.SphereGeometry(CFG.physics.ballRadius,16,12),new THREE.MeshBasicMaterial({color:'#b2f3eb',transparent:true,opacity:.36}));contactGuide.add(contactGhost);
const contactStem=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#a8e5e1',dashSize:.1,gapSize:.08,transparent:true,opacity:.6}));contactGuide.add(contactStem);
function updateContactGuide(){contactGuide.visible=!!plan&&phase==='flight';if(!plan)return;contactGuide.position.set(plan.ball.x,0,plan.ball.z);contactGhost.position.y=plan.ball.y;contactStem.geometry.dispose();contactStem.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,.04,0),new THREE.Vector3(0,plan.ball.y,0)]);contactStem.computeLineDistances()}
// Highlight the only legal service box, independently from the predicted landing.
const serviceBox=new THREE.Mesh(new THREE.PlaneGeometry(CFG.court.halfWidth,CFG.court.serviceDepth),new THREE.MeshBasicMaterial({color:'#e8f394',transparent:true,opacity:.14,depthWrite:false}));serviceBox.rotation.x=-Math.PI/2;serviceBox.position.y=-.025;scene.add(serviceBox);
function say(text){message.textContent=text}
function ready(){return (servingInput()||(choosingReturn()&&!returnStrategy.locked))&&!paused&&$('startMenu').hidden&&$('sideMenu').hidden&&match.winner===null}
let lastShotSpeed=null;
function showShotSpeed(who,type,serving,perfect,velocity){
 const kmh=Math.round(speedKmh(velocity));lastShotSpeed={who,kmh,perfect};
 const panel=$('shotSpeed');panel.hidden=false;panel.classList.toggle('perfect',perfect);
 $('shotSpeedValue').textContent=kmh;
 $('shotSpeedLabel').textContent=(who===0?'你':'电脑')+' · '+(serving?'发球':{flat:'平击',top:'上旋',slice:'切削',volley:'网前截击',smash:'高压扣杀'}[type]);
 $('shotSpeedQuality').textContent=perfect?'PERFECT · 暴力击球':'出拍球速';
 panel.setAttribute('aria-label',(who===0?'你':'电脑')+(perfect?' Perfect 暴力击球':'击球')+'，出拍球速 '+kmh+' 千米每小时');
}
function cost(power,type){return CFG.stamina.shotBaseCost+power*CFG.stamina.shotPowerCost+(CFG.stamina.shotTypeCost[type]||0)}
function ui(){
 const labels=match.labels();for(let i=0;i<2;i++){$('sets'+i).textContent=match.sets[i];$('games'+i).textContent=match.games[i];$('points'+i).textContent=labels[i];$('server'+i).style.visibility=match.server===i?'visible':'hidden'}
 $('courtMenu').hidden=!started||!$('startMenu').hidden||!$('sideMenu').hidden;
 $('pointHeading').textContent=match.tieBreak?'TB':'分';
 $('scoreStatus').textContent=match.winner!==null?'比赛结束':match.tieBreak?'抢七':match.decidingPoint?'金球':match.points.every(p=>p>=3)?(match.points[0]===match.points[1]?'平分':'占先'):'第 '+(match.games[0]+match.games[1]+1)+' 局';
 let status=(match.server===0?'你':'电脑')+'发球 · '+(serveAttempt===1?'一发':'二发')+' · '+(match.serviceSide===0?'右区':'左区');
 if(choosingReturn())status=returnStrategy.locked?'已锁定 · '+({top:'上旋',flat:'平击',slice:'切削'}[returnStrategy.locked.type]):'长按预选下一拍';
 if(paused)status='暂停 · 点击继续';
 else if(phase==='point')status='本分结束 · 点击继续';
 else if(phase==='fault')status='发球重试 · 点击继续';
 else if(phase==='end')status=match.winner===0?'你赢了 · 点击重开':'电脑获胜 · 点击重开';
 $('serviceStatus').textContent=status;
 serviceBox.visible=started&&isServe&&!['menu','end','side'].includes(phase);if(serviceBox.visible){const sign=-ends[match.server]*(match.serviceSide===0?1:-1);serviceBox.position.set(sign*CFG.court.halfWidth/2,-.025,-ends[match.server]*CFG.court.serviceDepth/2)}
}
function forces(body){const f=aerodynamicForce(body.velocity,body.angularVelocity);body.applyForce(new C.Vec3(f.x,f.y,f.z))}
function simulation({floorEnabled=false,netEnabled=false,origin=null}={}){
 const w=new C.World({gravity:new C.Vec3(0,-CFG.physics.gravity,0)});w.solver.iterations=CFG.physics.solverIterations;for(const cm of world.contactmaterials)w.addContactMaterial(cm);
 let ground=null;if(floorEnabled){ground=new C.Body({mass:0,material:grass,shape:new C.Plane()});ground.quaternion.copy(floor.quaternion);ground.position.copy(floor.position);w.addBody(ground)}
 if(netEnabled)w.addBody(new C.Body({mass:0,material:netMat,shape:new C.Box(new C.Vec3(netHalfWidth,.55,.035)),position:new C.Vec3(0,.5,0)}));
 const b=new C.Body({mass:CFG.physics.ballMass,material:felt,shape:new C.Sphere(CFG.physics.ballRadius),linearDamping:0,angularDamping:CFG.physics.angularDamping});b.position.copy(origin||physicalBall.position);b.velocity.copy(physicalBall.velocity);b.angularVelocity.copy(physicalBall.angularVelocity);w.addBody(b);return {w,b,ground};
}
function trajectory(who,type,target,power,perfect=false,pad=null,origin=null){
 const p=origin||physicalBall.position;
 const solved=solveShot(p,target,type,power,perfect,pad,stamina[who]);
 const v=new C.Vec3(solved.v.x,solved.v.y,solved.v.z),spin=solved.spin,n=Math.round(solved.time/PHYSICS_STEP);
 // Trace with court and net colliders, using exactly the live fixed-step forces.
 const {w,b,ground}=simulation({floorEnabled:true,netEnabled:true,origin});b.velocity.copy(v);b.angularVelocity.set(spin.x,spin.y,spin.z);let landing=null,firstBounce=-1;const points=[];
 b.addEventListener('collide',event=>{if(event.body===ground&&!landing){landing=b.position.clone();firstBounce=points.length}});
 for(let i=0;i<n+100;i++){if(i%3===0)points.push(new THREE.Vector3(b.position.x,b.position.y,b.position.z));forces(b);w.step(PHYSICS_STEP);if(landing&&points.length-firstBounce>22)break;}
 return {v,spin,points,landing};
}
function runSpeed(who){return (who===0?CFG.movement.humanSpeed:CFG.movement.cpuSpeed[difficulty])*staminaEffects(stamina[who]).movement}
function predict(){
 const {w,b,ground}=simulation({floorEnabled:true,netEnabled:true});let bounce=0,landing=null,predictedTime=0;const receiver=1-lastHitter,samples=[];
 b.addEventListener('collide',event=>{if(event.body===ground){bounce++;if(!landing)landing={x:b.position.x,z:b.position.z,time:predictedTime}}});
 for(let i=1;i<CFG.tactics.predictionSteps;i++){
  predictedTime=i*PHYSICS_STEP;forces(b);w.step(PHYSICS_STEP);if(bounce>=2)break;
  if(landing){const legal=isServe?validServiceLanding(landing.x,landing.z,ends[lastHitter],match.serviceSide):Math.abs(landing.x)<=CFG.court.halfWidth+CFG.physics.ballRadius&&Math.abs(landing.z)<=CFG.court.halfLength+CFG.physics.ballRadius&&landing.z*ends[receiver]>0;if(!legal)return null;}
  if(bounce===1||(!isServe&&bounce===0))samples.push({x:b.position.x,y:b.position.y,z:b.position.z,vx:b.velocity.x,vy:b.velocity.y,vz:b.velocity.z,time:predictedTime,bounces:bounce,landing});
 }
 const contact=selectContact(samples,{position:players[receiver].position,end:ends[receiver],speed:runSpeed(receiver),stamina:stamina[receiver],allowAir:!isServe});
 return contact?{...contact,receiver}:null;
}
function movePlayerTo(who,target,dt,speedFactor=1){
 if(!target)return true;target=clampPlayerTarget(target);const p=players[who].position,dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz);
 const move=Math.min(distance,runSpeed(who)*speedFactor*dt);if(distance>.001){p.x+=dx/distance*move;p.z+=dz/distance*move;energy.spend(who,move*CFG.stamina.runCostPerMeter)}return distance-move<CFG.movement.arrivalTolerance;
}
function recoverPlayers(dt,excluded=null){
 for(let who=0;who<2;who++){
  if(who===excluded||!recoveryTargets[who])continue;
  if(recoveryDelay[who]>0){recoveryDelay[who]=Math.max(0,recoveryDelay[who]-dt);continue}
  if(movePlayerTo(who,recoveryTargets[who],dt,CFG.movement.recoveryMultiplier))recoveryTargets[who]=null;
 }
}
function viewEnd(){if(screenLayout)fitCourtCamera(camera,screenLayout,ends[0])}
function prepareServe(){
 clearReturn();cancelHold();plan=null;recoveryTargets=[null,null];recoveryDelay=[0,0];contactGuide.visible=false;elapsed=0;acc=0;decision=null;bounces=0;netTouched=false;isServe=true;selected='flat';serveSpin={x:0,y:0};pendingStroke=null;
 if(match.decidingPoint&&match.sideOverride===null){
  if(match.server===1){phase='side';$('sideMenu').hidden=false;say('金球决胜：由接发方选择一区或二区');ui();return}
  match.sideOverride=Math.random()<.5?0:1;
 }
 const server=match.server,receiver=1-server,sign=ends[server]*(match.serviceSide===0?1:-1);
 players[server].position.set(sign*2,0,ends[server]*(CFG.court.halfLength+.65));players[receiver].position.set(-sign*2.2,0,ends[receiver]*CFG.shot.receiverDepth);
 physicalBall.position.set(players[server].position.x,CFG.shot.serveContactHeight,ends[server]*(CFG.court.halfLength+.25));physicalBall.velocity.setZero();physicalBall.angularVelocity.setZero();physicalBall.force.setZero();physicalBall.torque.setZero();lastHitter=server;
 aim={x:-sign*2,z:-ends[server]*CFG.shot.serveTargetDepth};dirty=true;phase=server===0?'choose':'ai';aiWait=CFG.ai.serveWait;
 say(server===0?(serveAttempt===1?(match.serviceSide===0?'一区':'二区')+'发球 · 长按，瞄准高亮斜对角发球区':'二发机会 · 再次失误将失分'):'电脑'+(serveAttempt===2?'二发':'发球')+' · '+(match.serviceSide===0?'一区':'二区'));ui();
}
function finishPoint(who,reason){
 clearReturn();cancelHold();const result=match.award(who);energy.finishPoint(result.game);
 sounds.point(who===0);
 if(result.changeEnds){ends=ends.map(v=>-v);viewEnd()}
 phase=match.winner===null?'point':'end';plan=null;recoveryTargets=[null,null];contactGuide.visible=false;acc=0;serveAttempt=1;serviceBox.visible=false;marker.visible=false;aimLine.visible=false;
 say((who===0?'你得分':'电脑得分')+' · '+reason+(result.set?' · 本盘结束':result.game?' · 本局结束，交换发球权'+(result.changeEnds?'并交换场地':''):''));ui();
}
function serviceFault(reason){
 clearReturn();cancelHold();
 if(serveAttempt===1){serveAttempt=2;phase='fault';plan=null;recoveryTargets=[null,null];contactGuide.visible=false;acc=0;marker.visible=false;say('一发失误 · '+reason+' · 还有一次发球机会');ui()}
 else finishPoint(1-match.server,'双误');
}
physicalBall.addEventListener('collide',e=>{
 if(phase!=='flight'||decision)return;
 if(e.body===netBody){netTouched=true;sounds.net();return}if(e.body!==floor)return;
 sounds.bounce();
 const p=physicalBall.position;
 if(isServe){
  const valid=validServiceLanding(p.x,p.z,ends[match.server],match.serviceSide);
  if(!valid){decision={type:'fault',reason:'未落入斜对角发球区'};return}
  if(netTouched){decision={type:'let'};return}isServe=false;bounces=1;return;
 }
 const onReceiver=p.z*ends[1-lastHitter]>0;
 if(bounces===0&&(Math.abs(p.x)>CFG.court.halfWidth+CFG.physics.ballRadius||Math.abs(p.z)>CFG.court.halfLength+CFG.physics.ballRadius||!onReceiver))decision={type:'point',who:1-lastHitter,reason:onReceiver?'回球出界':'回球未过网'};
 else if(++bounces>=2)decision={type:'point',who:lastHitter,reason:'对手未能在第二次落地前回球'};
});
function strike(who,type,power,perfect=false){
 clearReturn();const serving=isServe;
 const pad=serving?(who===0?{...serveSpin}:servePad((Math.random()-.5)*CFG.ai.serveSideRange,serveAttempt===2?CFG.ai.secondServeTop:Math.random()*CFG.ai.firstServeTopRange)):null;
 if(serving)type=pad.y>.25?'top':'flat';
 const backhand=(physicalBall.position.x-players[who].position.x)*ends[who]<CFG.shot.backhandThreshold;
 pendingStroke={who,type,power,perfect,pad,serving};phase='stroke';recoveryTargets[who]=null;plan=null;contactGuide.visible=false;acc=0;
 beginStroke(players[who],{type,backhand,serve:serving,pad});aimLine.visible=false;marker.visible=false;ui();
}
function launchStroke(who,type,power,perfect=false,pad=null,returnChoice=null){
 if(who===0){cancelHold();clearReturn()}else rallyWindup=null;
 const serving=isServe,sign=ends[who]*(match.serviceSide===0?1:-1);
 flightIsServe=serving;
 let target=who===0?{...(returnChoice?.target||aim)}:serving?{x:-sign*(CFG.ai.serveXMin+Math.random()*CFG.ai.serveXRange),z:-ends[who]*(CFG.ai.serveDepthMin+Math.random()*CFG.ai.serveDepthRange)}:{x:(Math.random()-.5)*CFG.ai.returnWidth,z:-ends[who]*(CFG.ai.returnDepthMin+Math.random()*CFG.ai.returnDepthRange)};
 if(who===0&&!perfect){target.x+=(Math.random()-.5)*Math.abs((returnChoice?.gauge??gauge)-.5)*CFG.shot.timingScatter;target.z+=(power-CFG.shot.neutralPower)*CFG.shot.powerDepthOffset}
 target=fatigueTarget(target,stamina[who]);
 const shot=trajectory(who,type,target,power,perfect,pad);physicalBall.velocity.copy(serveVelocityError(shot.v,{serving,attempt:serveAttempt,type,pad,power,perfect}));physicalBall.angularVelocity.set(shot.spin.x,shot.spin.y,shot.spin.z);physicalBall.force.setZero();physicalBall.torque.setZero();
 showShotSpeed(who,type,serving,perfect,physicalBall.velocity);
 sounds.hit({type,serving,perfect,speed:speedKmh(physicalBall.velocity)});
 if(!serving)energy.spend(who,cost(power,type)*(perfect?CFG.stamina.perfectCostMultiplier:1));lastHitter=who;bounces=0;decision=null;netTouched=false;elapsed=0;acc=0;phase='flight';plan=predict();
 recoveryTargets[1-who]=null;recoveryTargets[who]=recoveryPosition({end:ends[who],opponentContact:plan?.ball||shot.landing||target,strikePosition:players[who].position});recoveryDelay[who]=CFG.movement.recoveryDelay;updateContactGuide();
 if(plan){
  rallyWindup={receiver:plan.receiver,started:false,choice:plan.receiver===1?{type:['top','flat','slice'][Math.floor(Math.random()*3)],power:CFG.ai.returnPowerMin+Math.random()*CFG.ai.returnPowerRange,perfect:false}:null};
 }
 if(who===0){
  selected='flat';gauge=.5;aim={x:THREE.MathUtils.clamp(-target.x*.35,-4.2,4.2),z:-ends[0]*8};
  returnStrategy.afterOwnShot(currentReturnChoice());
 }else if(plan){
  if(!returnStrategy.active){selected='flat';gauge=.5;aim={x:THREE.MathUtils.clamp(-plan.ball.x*.35,-4.2,4.2),z:-ends[0]*8}}
  returnStrategy.opponentShot(currentReturnChoice());
 }
 dirty=true;
 aimLine.visible=false;marker.visible=!!plan?.landing;if(marker.visible)marker.position.set(plan.landing.x,.015,plan.landing.z);
 say(type==='smash'?'高压扣杀！抓住对手高球机会':type==='volley'?'网前截击！提前拦截软球':perfect?`PERFECT 暴力击球 ✦ 球速 +${Math.round((CFG.shot.perfectSpeed-1)*100)}% · 击球体力消耗 −${Math.round((1-CFG.stamina.perfectCostMultiplier)*100)}%`:who===0?'已出球 · 现在即可长按预选下一拍，松手锁定':returnStrategy.locked?'对手已出球 · 已保留锁定策略，到点自动击球':'对手已出球 · 长按选择仍有效，到点自动击球');
 if(perfect){ball.material.emissive.set('#ffc547');ball.material.emissiveIntensity=1;setTimeout(()=>{ball.material.emissive.set('#687a16');ball.material.emissiveIntensity=.3},1500)}ui();
}
function step(dt){
 elapsed+=dt;
 recoverPlayers(dt,plan?.receiver);
 if(plan)movePlayerTo(plan.receiver,plan,dt);
 forces(physicalBall);world.step(dt);
 if(decision){const d=decision;decision=null;if(d.type==='fault')serviceFault(d.reason);else if(d.type==='let'){phase='fault';plan=null;clearReturn();cancelHold();recoveryTargets=[null,null];contactGuide.visible=false;acc=0;say('发球擦网且落区正确 · 重发，保留当前发球次数');ui()}else finishPoint(d.who,d.reason);return}
 if(plan){
  // Prepare the swing before the deadline while ball physics and running continue.
  if(rallyWindup&&!rallyWindup.started&&plan.time-elapsed<=CFG.animation.strokeDuration*CFG.animation.contact*flightTimeScale(flightIsServe)){
   const choice=plan.receiver===0?returnStrategy.current(currentReturnChoice()):rallyWindup.choice;
   beginStroke(players[plan.receiver],{type:plan.kind||choice?.type||'flat',backhand:plan.backhand,serve:false});rallyWindup.started=true;
  }
  if(elapsed>=plan.time){
   const receiver=plan.receiver,p=players[receiver];
   if(Math.hypot(p.position.x-plan.x,p.position.z-plan.z)<CFG.shot.contactTolerance){
    const choice=receiver===0?returnStrategy.resolve(currentReturnChoice()):rallyWindup?.choice||{type:'flat',power:CFG.shot.neutralPower,perfect:false};
    choice.type=plan.kind||choice.type;const backhand=plan.backhand;marker.visible=false;contactGuide.visible=false;turn++;
    if(receiver===0){if(hold)retiredPointerId=hold.id;cancelHold()}
    if(!players[receiver].userData.rig.swing)beginStroke(players[receiver],{type:choice.type,backhand,serve:false});
    const swing=players[receiver].userData.rig.swing;swing.type=choice.type;swing.backhand=backhand;swing.time=swing.duration*swing.contact;swing.hit=true;
    if(receiver===0){selected=choice.type;gauge=choice.gauge;aim={...choice.target}}
    pendingStroke=null;launchStroke(receiver,choice.type,choice.power,choice.perfect,null,receiver===0?choice:null);return;
   }
   plan=null;contactGuide.visible=false;clearReturn();cancelHold();
  }
 }
 if(elapsed>CFG.tactics.rallyTimeout||Math.abs(physicalBall.position.x)>courtSize.halfWidth+CFG.tactics.escapeMargin||Math.abs(physicalBall.position.z)>courtSize.halfLength+CFG.tactics.escapeMargin){if(isServe)serviceFault('发球未能有效过网');else finishPoint(bounces?lastHitter:1-lastHitter,bounces?'未能回球':'击球出界')}
}
function cancelHold(){const previous=hold;hold=null;if(previous){clearTimeout(previous.timer);if(previous.surface.hasPointerCapture(previous.id))previous.surface.releasePointerCapture(previous.id)}wheel.hidden=true;$('serveDial').hidden=true;$('powerPanel').hidden=true;}
function updateServeDial(){
 const x=serveSpin.x,y=serveSpin.y;$('serveKnob').style.transform='translate('+x*82+'px,'+(-y*82)+'px)';
 $('serveVector').setAttribute('x2',124+x*82);$('serveVector').setAttribute('y2',124-y*82);
 const text=Math.hypot(x,y)<.12?'纯平击':(y>.1?'上旋 '+Math.round(y*100)+'%':'')+(Math.abs(x)>.1?' / '+(x>0?'右':'左')+'侧旋 '+Math.round(Math.abs(x)*100)+'%':'');
 $('serveSpinLabel').textContent=text.replace(/^ \/ /,'');$('serveKnob').setAttribute('aria-valuetext',text);$('serveDial').classList.toggle('flat',Math.hypot(x,y)<.12);
}
function showWheel(){
 if(!hold||!ready()){cancelHold();return}hold.ready=true;hold.chargeStart=performance.now();hold.mode=servingInput()?'serve':'rally';gauge=0;
 if(servingInput()){
  placeCurrentGesture();$('serveDial').hidden=false;
  hold.spinOrigin={x:hold.x,y:hold.y};serveSpin={x:0,y:0};updateServeDial();say('拖动圆心：平击 / 上旋 / 左右侧旋；斜向可混合旋转');
 }else{
  placeCurrentGesture();wheel.hidden=false;hold.pressOrigin={x:hold.x,y:hold.y};updateNodes();say('↑ 上旋 / ↙ 平击 / ↘ 切削 · 旁边力量条的金色区域松手 = PERFECT');
 }
 $('powerPanel').hidden=false;dirty=true;
}
function updateNodes(){wheel.querySelectorAll('[data-shot]').forEach(node=>node.classList.toggle('selected',node.dataset.shot===selected))}
function beginHold(e){if(e.isPrimary===false)return;if(!hold){retiredPointerId=null;ignoreNextClick=false}if(e.button!==0||!ready()||hold)return;if(e.currentTarget===canvas)aimAt(e);e.preventDefault();const surface=e.currentTarget;surface.setPointerCapture(e.pointerId);hold={surface,id:e.pointerId,pointerType:e.pointerType,x:e.clientX,y:e.clientY,ready:false,timer:setTimeout(showWheel,CFG.input.holdMs)};}
function moveHold(e){
 if(!hold||e.pointerId!==hold.id)return;e.preventDefault();if(!hold.ready){if(hold.pointerType==='touch'){hold.x=e.clientX;hold.y=e.clientY;aimAt(e,true)}return}if(hold.mode==='serve'){serveSpin=servePad((e.clientX-hold.spinOrigin.x)/hold.radius,(hold.spinOrigin.y-e.clientY)/hold.radius);updateServeDial();dirty=true;return}const origin=screenLayout?.mobile||hold.pointerType==='touch'?hold.pressOrigin:hold.origin;
 const next=directionShot(e.clientX-origin.x,e.clientY-origin.y);if(next&&next!==selected){selected=next;dirty=true;updateNodes()}
}
function finishHold(e){
 if(!hold){if(e.pointerId===retiredPointerId){retiredPointerId=null;ignoreNextClick=true}return}
 if(e.pointerId!==hold.id)return;const didHold=hold.ready,isReturn=choosingReturn(),choice=currentReturnChoice();
 if(didHold)gauge=(1-Math.cos((performance.now()-hold.chargeStart)*CFG.input.chargeRate))/2;
 cancelHold();if(!didHold){say(`请长按至少 ${CFG.input.holdMs/1000} 秒，拖动后松手锁定`);return}
 if(isReturn){if(returnStrategy.lock(choice)){dirty=true;say('策略已锁定 · 到达击球点自动执行');ui()}return}
 if(ready())strike(0,selected,Math.round(CFG.input.minimumPower+gauge*CFG.input.powerRange),Math.abs(gauge-CFG.input.perfectCenter)<=CFG.input.perfectHalfWidth);
}
for(const surface of [canvas]){surface.addEventListener('pointerdown',beginHold);surface.addEventListener('pointermove',moveHold);surface.addEventListener('pointerup',finishHold);surface.addEventListener('pointercancel',e=>{if(hold?.id===e.pointerId)cancelHold()});surface.addEventListener('lostpointercapture',()=>{if(hold?.surface===surface)cancelHold()});surface.addEventListener('contextmenu',e=>e.preventDefault())}
const ray=new THREE.Raycaster(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),intersection=new THREE.Vector3();
function aimAt(e,whilePress=false){if(!ready()||(hold&&!whilePress))return;const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);if(!ray.ray.intersectPlane(groundPlane,intersection))return;
 if(servingInput()){const sign=-ends[match.server]*(match.serviceSide===0?1:-1);aim={x:sign*THREE.MathUtils.clamp(intersection.x*sign,CFG.shot.aimLineMargin,CFG.court.halfWidth-CFG.shot.aimLineMargin),z:-ends[0]*THREE.MathUtils.clamp(-intersection.z*ends[0],1,CFG.court.serviceDepth-CFG.shot.aimLineMargin)}}
 else aim={x:THREE.MathUtils.clamp(intersection.x,-CFG.court.halfWidth+CFG.shot.aimLineMargin,CFG.court.halfWidth-CFG.shot.aimLineMargin),z:-ends[0]*THREE.MathUtils.clamp(-intersection.z*ends[0],2,CFG.court.halfLength-CFG.shot.aimLineMargin)};dirty=true;
}
canvas.addEventListener('pointermove',e=>aimAt(e));
function updateVisuals(now,dt){
 if(incomingReturn()&&rallyWindup?.started){const swing=human.userData.rig.swing,choice=returnStrategy.current(currentReturnChoice(now));if(swing&&choice)swing.type=plan.kind||choice.type}
 const animationPaused=paused||!$('startMenu').hidden||!$('sideMenu').hidden;
 for(let i=0;i<2;i++){
  const contact=updatePlayer(players[i],animationPaused?0:dt,{end:ends[i],moving:!!recoveryTargets[i]||(phase==='flight'&&plan?.receiver===i),serveReady:isServe&&match.server===i&&['choose','ai'].includes(phase),ready:phase==='choose',paused:animationPaused});
  if(contact&&pendingStroke?.who===i){const shot=pendingStroke;pendingStroke=null;launchStroke(shot.who,shot.type,shot.power,shot.perfect,shot.pad)}
 }
 contactGuide.visible=!!plan&&phase==='flight'&&!animationPaused;
 updatePlayerEnergy(dt);
 $('shotSpeed').hidden=!lastShotSpeed||!started||!$('startMenu').hidden||!$('sideMenu').hidden;
 shadow.position.set(physicalBall.position.x,-.015,physicalBall.position.z);shadow.scale.setScalar(1+physicalBall.position.y*.1);shadow.material.opacity=.3/(1+physicalBall.position.y*.25);
 if(hold?.ready&&!paused){const liveGauge=(1-Math.cos((now-hold.chargeStart)*CFG.input.chargeRate))/2;if(Math.abs(liveGauge-gauge)>CFG.view.previewGaugeDelta&&now-lastPreviewTime>CFG.view.previewChangeMs)dirty=true;gauge=liveGauge}
 const returnPreview=incomingReturn(),previewChoice=returnPreview?returnStrategy.current(currentReturnChoice(now)):null;
 aimLine.visible=(servingInput()||returnPreview)&&!animationPaused;
 if(aimLine.visible&&dirty&&now-lastPreviewTime>(screenLayout?.mobile?CFG.view.mobilePreviewMs:CFG.view.previewMs)){
  dirty=false;lastPreviewTime=now;
  const shot=trajectory(0,(returnPreview&&plan.kind)||previewChoice?.type||selected,previewChoice?.target||aim,previewChoice?.power||(hold?.ready?Math.round(CFG.input.minimumPower+gauge*CFG.input.powerRange):CFG.shot.neutralPower),previewChoice?previewChoice.perfect:!!hold?.ready&&Math.abs(gauge-CFG.input.perfectCenter)<=CFG.input.perfectHalfWidth,servingInput()?serveSpin:null,returnPreview?plan.ball:null);
  aimLine.geometry.dispose();aimLine.geometry=new THREE.BufferGeometry().setFromPoints(shot.points);aimLine.computeLineDistances();marker.visible=true;marker.position.set(shot.landing?.x??aim.x,.015,shot.landing?.z??aim.z);
 }
 if(!['choose','flight'].includes(phase))marker.visible=false;
 if(hold?.ready&&!paused){gauge=(1-Math.cos((now-hold.chargeStart)*CFG.input.chargeRate))/2;$('needle').style.bottom=(gauge*100)+'%';$('powerValue').textContent=Math.round(CFG.input.minimumPower+gauge*CFG.input.powerRange)+'%';$('timingText').textContent=Math.abs(gauge-CFG.input.perfectCenter)<=CFG.input.perfectHalfWidth?'✦ PERFECT':'金色区域松手'}
 ball.position.copy(physicalBall.position);ball.quaternion.copy(physicalBall.quaternion);
 if(isServe&&['choose','ai'].includes(phase))ball.position.y=1.3;
 if(pendingStroke?.serving){const u=strokeProgress(players[pendingStroke.who])||0;ball.position.y=1.3+(CFG.shot.serveContactHeight-1.3)*Math.sin(Math.min(u/CFG.animation.serveContact,1)*Math.PI/2);}
}
function next(){if(phase==='end'){openMenu();return}if(['point','fault'].includes(phase)&&!paused)prepareServe()}
canvas.addEventListener('click',e=>{if(e.isPrimary===false)return;if(ignoreNextClick){ignoreNextClick=false;return}if(paused&&$('startMenu').hidden&&$('sideMenu').hidden){togglePause();return}if(['point','fault','end'].includes(phase))next()});
function togglePause(){if(!started||!$('startMenu').hidden||!$('sideMenu').hidden)return;cancelHold();paused=!paused;say(paused?'已暂停 · P 或点击球场恢复比赛':phase==='choose'?'长按球场准备击球':'比赛继续');ui()}
addEventListener('keydown',e=>{if(hold?.ready&&hold.mode==='rally'&&['ArrowLeft','ArrowRight','ArrowUp'].includes(e.code)){e.preventDefault();selected=e.code==='ArrowUp'?'top':e.code==='ArrowLeft'?'flat':'slice';updateNodes();dirty=true;return}if(hold?.ready&&hold.mode==='serve'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.code)){e.preventDefault();serveSpin=e.code==='Home'?{x:0,y:0}:servePad(serveSpin.x+(e.code==='ArrowRight'?CFG.input.keyboardSpinStep:e.code==='ArrowLeft'?-CFG.input.keyboardSpinStep:0),serveSpin.y+(e.code==='ArrowUp'?CFG.input.keyboardSpinStep:e.code==='ArrowDown'?-CFG.input.keyboardSpinStep:0));updateServeDial();dirty=true;return}if(e.code==='Escape'&&started){if($('startMenu').hidden)openMenu();else $('resume').click();return}if(e.target.matches('input,select,button'))return;if(e.code==='KeyP')togglePause();if(e.code==='Space'){e.preventDefault();next()}});
function openMenu(){cancelHold();paused=true;$('startMenu').hidden=false;$('resume').hidden=!started||match.winner!==null;ui()}
$('gamesSetting').value=String(CFG.match.gamesToWin);$('difficultySetting').value=CFG.match.difficulty;document.querySelector('input[name="scoring"][value="'+(CFG.match.noAd?'golden':'ad')+'"]').checked=true;
$('resume').onclick=()=>{$('startMenu').hidden=true;paused=false;dirty=true;ui()};
$('setup').onsubmit=e=>{e.preventDefault();cancelHold();match=new TennisMatch({gamesToWin:Number($('gamesSetting').value),noAd:document.querySelector('input[name="scoring"]:checked').value==='golden'});difficulty=$('difficultySetting').value;started=true;paused=false;ends=[1,-1];viewEnd();energy.reset();stamina=energy.values;displayedStamina=[CFG.stamina.full,CFG.stamina.full];trailingStamina=[CFG.stamina.full,CFG.stamina.full];turn=1;serveAttempt=1;pendingStroke=null;lastShotSpeed=null;$('shotSpeed').hidden=true;for(const p of players)p.userData.rig.swing=null;$('startMenu').hidden=true;$('sideMenu').hidden=true;prepareServe()};
for(const node of document.querySelectorAll('[data-side]'))node.onclick=()=>{match.sideOverride=Number(node.dataset.side);$('sideMenu').hidden=true;prepareServe()};
addEventListener('blur',()=>{cancelHold();if(phase==='flight'||phase==='ai'||phase==='stroke'){paused=true;say('已暂停 · P 继续');ui()}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelHold();if(started&&['flight','ai','stroke'].includes(phase)){paused=true;ui()}}});
$('courtMenu').onclick=openMenu;
$('soundEnabled').checked=sounds.enabled;
$('soundEnabled').onchange=()=>{sounds.setEnabled($('soundEnabled').checked);if(sounds.enabled)void sounds.unlock()};
document.addEventListener('pointerdown',()=>{void sounds.unlock()},{capture:true});
document.addEventListener('keydown',()=>{void sounds.unlock()},{capture:true});
const perfectZone=document.querySelector('.perfect-zone');perfectZone.style.bottom=(CFG.input.perfectCenter-CFG.input.perfectHalfWidth)*100+'%';perfectZone.style.height=CFG.input.perfectHalfWidth*200+'%';
new ResizeObserver(resizeCourt).observe(arena);
let last=performance.now();function tick(now){requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,CFG.physics.maximumFrameTime);last=now;if(!paused&&$('startMenu').hidden){if(['stroke','flight'].includes(phase))energy.recover(dt);if(phase==='ai'){aiWait-=dt;if(aiWait<=0)strike(1,serveAttempt===2?'top':'flat',CFG.ai.servePowerMin+Math.random()*CFG.ai.servePowerRange)}else if(phase==='stroke'){recoverPlayers(dt*CFG.physics.timeScale,pendingStroke?.who)}else if(phase==='flight'){acc+=dt*flightTimeScale(flightIsServe);while(acc>=PHYSICS_STEP&&phase==='flight'){acc-=PHYSICS_STEP;step(PHYSICS_STEP)}ui()}}updateVisuals(now,dt);renderer.render(scene,camera)}
physicalBall.position.set(0,1.3,10);ui();requestAnimationFrame(tick);
