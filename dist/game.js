import {viewportLayout,fitCourtCamera,gesturePlacement,directionShot} from './viewport.js';
import {Stamina,staminaEffects,fatigueTarget} from './stamina.js';
import {ReturnStrategy} from './return-strategy.js';
import {selectContact,recoveryPosition} from './tactics.js';
import {createPlayer,beginStroke,updatePlayer,strokeProgress} from './player.js';
import {servePad,spinVector,aerodynamicForce,PHYSICS_STEP} from './flight.js';
import {TennisMatch,validServiceLanding} from './rules.js';
import * as C from './vendor/cannon-es.js';
import * as THREE from './vendor/three.module.js';
const arena=document.querySelector('#arena'),message=document.querySelector('#announcement');
const scene=new THREE.Scene();scene.background=new THREE.Color('#274b38');scene.fog=new THREE.Fog('#274b38',27,65);
const camera=new THREE.PerspectiveCamera(43,1,.1,100);camera.position.set(0,20,27);camera.lookAt(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;arena.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xf5ffe2,0x34523e,2.5));const sun=new THREE.DirectionalLight(0xfff4d4,3);sun.position.set(-10,20,8);sun.castShadow=true;sun.shadow.normalBias=.025;sun.shadow.radius=4;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:18,bottom:-18});scene.add(sun);
function box(w,h,d,color,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.85}));mesh.position.set(x,y,z);mesh.receiveShadow=true;scene.add(mesh);return mesh}
box(14,.3,30,'#355d40',0,-.25);for(let i=0;i<12;i++)box(12,.02,2,i%2?'#719655':'#789d5d',0,-.08,-11+i*2);
function line(x,z,w,d){box(w,.025,d,'#e8ebcd',x,-.045,z)}for(const x of [-6,-4.5,4.5,6])line(x,0,.055,24);for(const z of [-12,12])line(0,z,12,.06);for(const z of [-5.5,5.5])line(0,z,9,.06);line(0,0,.055,11);
for(let i=0;i<=40;i++)box(.018,1.05,.018,'#c9d1bd',-6.4+i*.32,.5,0);for(let i=0;i<8;i++)box(12.8,.018,.018,'#a5b69c',0,i*.14,0);box(13,.08,.06,'#f4f0d8',0,1.1);for(const x of [-6.5,6.5])box(.12,1.4,.12,'#dde2ca',x,.6);
const human=createPlayer(scene,'#f5f0d8',10.5,'#386552'),cpu=createPlayer(scene,'#d88960',-10.5,'#f1dfb0');const ball=new THREE.Mesh(new THREE.SphereGeometry(.17,16,16),new THREE.MeshStandardMaterial({color:'#e2f76a',emissive:'#687a16',emissiveIntensity:.3}));ball.castShadow=true;scene.add(ball);for(const axis of [0,Math.PI/2]){const seam=new THREE.Mesh(new THREE.TorusGeometry(.171,.006,5,36),new THREE.MeshStandardMaterial({color:'#fbffe5',roughness:.8}));seam.rotation.x=axis;ball.add(seam);}
const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=256;const ctx=textureCanvas.getContext('2d');ctx.fillStyle='#eee';ctx.fillRect(0,0,256,256);for(let i=0;i<8000;i++){const shade=170+Math.random()*80;ctx.fillStyle='rgb('+shade+','+shade+','+shade+')';ctx.fillRect(Math.random()*256,Math.random()*256,1,3)}const grassTexture=new THREE.CanvasTexture(textureCanvas);grassTexture.wrapS=grassTexture.wrapT=THREE.RepeatWrapping;grassTexture.repeat.set(5,2);grassTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();scene.traverse(o=>{if(o.isMesh&&o.position.y===-.08){o.material.map=grassTexture;o.material.bumpMap=grassTexture;o.material.bumpScale=.03}});
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.26,24),new THREE.MeshBasicMaterial({color:'#112c1a',transparent:true,opacity:.25,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
const world=new C.World({gravity:new C.Vec3(0,-9.81,0)});world.solver.iterations=15;
const felt=new C.Material(),grass=new C.Material(),netMat=new C.Material();
world.addContactMaterial(new C.ContactMaterial(felt,grass,{friction:.4,restitution:.78}));world.addContactMaterial(new C.ContactMaterial(felt,netMat,{friction:.6,restitution:.1}));
const floor=new C.Body({mass:0,material:grass,shape:new C.Plane()});floor.quaternion.setFromEuler(-Math.PI/2,0,0);floor.position.y=-.06;world.addBody(floor);
const netBody=new C.Body({mass:0,material:netMat,shape:new C.Box(new C.Vec3(6.5,.55,.035)),position:new C.Vec3(0,.5,0)});world.addBody(netBody);
const physicalBall=new C.Body({mass:.057,material:felt,shape:new C.Sphere(.17),linearDamping:0,angularDamping:.2});world.addBody(physicalBall);


const $=id=>document.getElementById(id),players=[human,cpu];
const energy=new Stamina();
let match=new TennisMatch(),difficulty='normal',phase='menu',started=false,paused=false,stamina=energy.values,ends=[1,-1];
let lastHitter=0,bounces=0,decision=null,isServe=true,serveAttempt=1,netTouched=false;
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
 renderer.setPixelRatio(Math.min(devicePixelRatio,screenLayout.mobile?1.5:2));renderer.setSize(width,height);fitCourtCamera(camera,screenLayout,ends[0]);
 const viewDistance=camera.position.length();scene.fog.near=Math.max(27,viewDistance-8);scene.fog.far=viewDistance+80;
 const shadowSize=screenLayout.mobile?1024:2048;
 if(sun.shadow.mapSize.x!==shadowSize){sun.shadow.mapSize.set(shadowSize,shadowSize);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}renderer.shadowMap.needsUpdate=true}
 if(hold?.ready)placeCurrentGesture();dirty=true;
}
function placeCurrentGesture(){
 if(!hold||!screenLayout)return;
 const kind=hold.mode==='serve'?'serve':'rally',p=gesturePlacement(screenLayout,hold.x,hold.y,kind),element=kind==='serve'?$('serveDial'):wheel;
 element.style.left=p.left+'px';element.style.top=p.top+'px';element.style.transform='scale('+p.scale+')';element.style.transformOrigin='top left';
 if(kind==='serve')hold.radius=82*p.scale;else hold.origin={x:p.left+145*p.scale,y:p.top+140*p.scale};
}

let serveSpin={x:0,y:0},pendingStroke=null,lastPreviewTime=0;
let recoveryTargets=[null,null],recoveryDelay=[0,0];
const returnStrategy=new ReturnStrategy();
let rallyWindup=null,retiredPointerId=null,ignoreNextClick=false;
function incomingReturn(){return phase==='flight'&&lastHitter===1&&plan?.receiver===0&&returnStrategy.active}
function servingInput(){return phase==='choose'&&isServe&&match.server===0}
function currentReturnChoice(now=performance.now()){
 const charging=hold?.ready&&hold.mode==='rally',value=charging?(1-Math.cos((now-hold.chargeStart)*.004))/2:.5;
 return {type:selected,power:charging?Math.round(35+value*60):65,perfect:charging&&Math.abs(value-.5)<=.075,gauge:value,target:{...aim}};
}
function clearReturn(){returnStrategy.close();rallyWindup=null;}

let displayedStamina=[100,100],trailingStamina=[100,100];
const energyViews=players.map((_,i)=>({root:$('playerEnergy'+i),meter:$('energy'+i),label:$('value'+i),fill:$('energy'+i).querySelector('.energy-fill'),trail:$('energy'+i).querySelector('.energy-trail')}));
const feetPosition=new THREE.Vector3();
function updatePlayerEnergy(dt){
 camera.updateMatrixWorld();
 for(let i=0;i<2;i++){
  const view=energyViews[i],target=stamina[i],falling=displayedStamina[i]>target;
  // Ease the displayed gauge in real time; gameplay always uses the true stamina.
  displayedStamina[i]+=(target-displayedStamina[i])*(1-Math.exp(-dt*(falling?3.8:2.8)));
  if(Math.abs(target-displayedStamina[i])<.025)displayedStamina[i]=target;
  trailingStamina[i]+=(displayedStamina[i]-trailingStamina[i])*(1-Math.exp(-dt*1.7));
  feetPosition.copy(players[i].position);feetPosition.y=0;feetPosition.project(camera);
  const visible=started&&$('startMenu').hidden&&$('sideMenu').hidden&&Math.abs(feetPosition.x)<1&&Math.abs(feetPosition.y)<1&&feetPosition.z>-1&&feetPosition.z<1;
  view.root.hidden=!visible;
  if(visible){view.root.style.left=((feetPosition.x*.5+.5)*arena.clientWidth)+'px';view.root.style.top=((-feetPosition.y*.5+.5)*arena.clientHeight+8)+'px'}
  view.fill.style.transform='scaleX('+displayedStamina[i]/100+')';view.trail.style.transform='scaleX('+Math.max(displayedStamina[i],trailingStamina[i])/100+')';
  view.meter.style.background=`linear-gradient(to right,#173a2bda ${energy.caps[i]}%,#080f0c ${energy.caps[i]}%)`;
  view.root.classList.toggle('low',target<25);view.root.classList.toggle('tired',target>=25&&target<45);
  view.root.classList.toggle('draining',falling&&displayedStamina[i]-target>.3);
  view.label.textContent=Math.round(displayedStamina[i])+'/'+Math.round(energy.caps[i]);view.meter.setAttribute('aria-valuenow',String(Math.round(target)));
  view.meter.setAttribute('aria-valuemax',String(energy.caps[i]));
  view.meter.setAttribute('aria-valuetext',`体力 ${Math.round(target)}，上限 ${Math.round(energy.caps[i])}${energy.exhausted[i]?'，下回合上限降低 10%':''}`);
  view.root.title=energy.exhausted[i]?'本回合体力已耗尽，下回合上限降低 10%':'每秒恢复 2 点；每分结束补满，每局结束上限恢复 100%';
 }
}
const aimLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#f5eda5',dashSize:.25,gapSize:.15}));scene.add(aimLine);
const marker=new THREE.Mesh(new THREE.RingGeometry(.28,.4,32),new THREE.MeshBasicMaterial({color:'#eff69d',side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.y=.015;scene.add(marker);
// Cyan ghost marks the actual post-bounce contact, separate from the landing ring.
const contactGuide=new THREE.Group();scene.add(contactGuide);contactGuide.visible=false;
const contactHalo=new THREE.Mesh(new THREE.RingGeometry(.23,.3,28),new THREE.MeshBasicMaterial({color:'#a8e5e1',transparent:true,opacity:.7,side:THREE.DoubleSide}));contactHalo.rotation.x=-Math.PI/2;contactHalo.position.y=.018;contactGuide.add(contactHalo);
const contactGhost=new THREE.Mesh(new THREE.SphereGeometry(.17,16,12),new THREE.MeshBasicMaterial({color:'#b2f3eb',transparent:true,opacity:.36}));contactGuide.add(contactGhost);
const contactStem=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#a8e5e1',dashSize:.1,gapSize:.08,transparent:true,opacity:.6}));contactGuide.add(contactStem);
function updateContactGuide(){contactGuide.visible=!!plan&&phase==='flight';if(!plan)return;contactGuide.position.set(plan.ball.x,0,plan.ball.z);contactGhost.position.y=plan.ball.y;contactStem.geometry.dispose();contactStem.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,.04,0),new THREE.Vector3(0,plan.ball.y,0)]);contactStem.computeLineDistances()}
// Highlight the only legal service box, independently from the predicted landing.
const serviceBox=new THREE.Mesh(new THREE.PlaneGeometry(4.5,5.5),new THREE.MeshBasicMaterial({color:'#e8f394',transparent:true,opacity:.14,depthWrite:false}));serviceBox.rotation.x=-Math.PI/2;serviceBox.position.y=-.025;scene.add(serviceBox);
function say(text){message.textContent=text}
function ready(){return (phase==='choose'||(incomingReturn()&&!returnStrategy.locked))&&!paused&&$('startMenu').hidden&&$('sideMenu').hidden&&match.winner===null}
function cost(power,type){return 4+power*.14+(type==='top'?4:type==='slice'?2:0)}
function ui(){
 const labels=match.labels();for(let i=0;i<2;i++){$('sets'+i).textContent=match.sets[i];$('games'+i).textContent=match.games[i];$('points'+i).textContent=labels[i];$('server'+i).style.visibility=match.server===i?'visible':'hidden'}
 $('courtMenu').hidden=!started||!$('startMenu').hidden||!$('sideMenu').hidden;
 $('pointHeading').textContent=match.tieBreak?'TB':'分';
 $('scoreStatus').textContent=match.winner!==null?'比赛结束':match.tieBreak?'TIEBREAK / 抢七':match.decidingPoint?'GOLDEN POINT':match.points.every(p=>p>=3)?(match.points[0]===match.points[1]?'DEUCE / 平分':'ADVANTAGE / 占先'):'SET 1';
 $('serviceStatus').textContent=(match.tieBreak?'抢七':'第 '+(match.games[0]+match.games[1]+1)+' 局')+' · '+(match.server===0?'你':'电脑')+'发球 · '+(match.serviceSide===0?'一区 / 右区':'二区 / 左区')+(isServe?' · '+(serveAttempt===1?'一发':'二发')+(phase==='choose'?' · 长按旋转圆盘':''):'');
 if(incomingReturn())$('serviceStatus').textContent+=' · '+(returnStrategy.locked?'已锁定 '+({top:'上旋',flat:'平击',slice:'切削'}[returnStrategy.locked.type])+' '+returnStrategy.locked.power+'%':'来球中 · 长按预选');
 if(paused&&$('startMenu').hidden)$('serviceStatus').textContent='已暂停 · 点击球场或 P 继续 / Esc 设置';
 else if(phase==='point')$('serviceStatus').textContent+=' · 点击球场继续';
 else if(phase==='fault')$('serviceStatus').textContent+=' · 发球失误 / 擦网，点击重发';
 else if(phase==='end')$('serviceStatus').textContent=(match.winner===0?'你赢得本盘':'电脑赢得本盘')+' · 点击球场开始新比赛';
 serviceBox.visible=started&&isServe&&!['menu','end','side'].includes(phase);if(serviceBox.visible){const sign=-ends[match.server]*(match.serviceSide===0?1:-1);serviceBox.position.set(sign*2.25,-.025,-ends[match.server]*2.75)}
}
function forces(body){const f=aerodynamicForce(body.velocity,body.angularVelocity);body.applyForce(new C.Vec3(f.x,f.y,f.z))}
function simulation({floorEnabled=false,netEnabled=false,origin=null}={}){
 const w=new C.World({gravity:new C.Vec3(0,-9.81,0)});w.solver.iterations=15;for(const cm of world.contactmaterials)w.addContactMaterial(cm);
 let ground=null;if(floorEnabled){ground=new C.Body({mass:0,material:grass,shape:new C.Plane()});ground.quaternion.copy(floor.quaternion);ground.position.copy(floor.position);w.addBody(ground)}
 if(netEnabled)w.addBody(new C.Body({mass:0,material:netMat,shape:new C.Box(new C.Vec3(6.5,.55,.035)),position:new C.Vec3(0,.5,0)}));
 const b=new C.Body({mass:.057,material:felt,shape:new C.Sphere(.17),linearDamping:0,angularDamping:.2});b.position.copy(origin||physicalBall.position);b.velocity.copy(physicalBall.velocity);b.angularVelocity.copy(physicalBall.angularVelocity);w.addBody(b);return {w,b,ground};
}
function trajectory(who,type,target,power,perfect=false,pad=null,origin=null){
 const p=origin||physicalBall.position,dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz);
 const pace=pad?18-pad.y*3-Math.abs(pad.x)*1.5:type==='flat'?17:type==='top'?12:13.5;
 const fatigue=staminaEffects(stamina[who]).pace;
 const time=Math.ceil(Math.max(.8,distance/pace)*(1+(65-power)*.002)/fatigue/(perfect?1.1:1)/PHYSICS_STEP)*PHYSICS_STEP;
 const v=new C.Vec3(dx/time,(.11-p.y+4.905*time*time)/time,dz/time);let spin;
 const n=Math.round(time/PHYSICS_STEP);
 for(let pass=0;pass<5;pass++){const {w,b}=simulation({origin});spin=spinVector(type,v,pad);b.velocity.copy(v);b.angularVelocity.set(spin.x,spin.y,spin.z);
  for(let i=0;i<n;i++){forces(b);w.step(PHYSICS_STEP)}
  if(pass<4){v.x+=(target.x-b.position.x)/time;v.y+=(.11-b.position.y)/time;v.z+=(target.z-b.position.z)/time;}
 }
 // Trace with court and net colliders, using exactly the live fixed-step forces.
 const {w,b,ground}=simulation({floorEnabled:true,netEnabled:true,origin});b.velocity.copy(v);b.angularVelocity.set(spin.x,spin.y,spin.z);let landing=null,firstBounce=-1;const points=[];
 b.addEventListener('collide',event=>{if(event.body===ground&&!landing){landing=b.position.clone();firstBounce=points.length}});
 for(let i=0;i<n+100;i++){if(i%3===0)points.push(new THREE.Vector3(b.position.x,b.position.y,b.position.z));forces(b);w.step(PHYSICS_STEP);if(landing&&points.length-firstBounce>22)break;}
 return {v,spin,points,landing};
}
function runSpeed(who){return (who===0?6.5:({easy:4.8,normal:6.8,hard:8.8}[difficulty]))*staminaEffects(stamina[who]).movement}
function predict(){
 const {w,b,ground}=simulation({floorEnabled:true,netEnabled:true});let bounce=0,landing=null,predictedTime=0;const receiver=1-lastHitter,samples=[];
 b.addEventListener('collide',event=>{if(event.body===ground){bounce++;if(!landing)landing={x:b.position.x,z:b.position.z,time:predictedTime}}});
 for(let i=1;i<1680;i++){
  predictedTime=i*PHYSICS_STEP;forces(b);w.step(PHYSICS_STEP);if(bounce>=2)break;
  if(landing){const legal=isServe?validServiceLanding(landing.x,landing.z,ends[lastHitter],match.serviceSide):Math.abs(landing.x)<=4.67&&Math.abs(landing.z)<=12.17&&landing.z*ends[receiver]>0;if(!legal)return null;}
  if(bounce===1)samples.push({x:b.position.x,y:b.position.y,z:b.position.z,vx:b.velocity.x,vy:b.velocity.y,vz:b.velocity.z,time:predictedTime,bounces:bounce,landing});
 }
 const contact=selectContact(samples,{position:players[receiver].position,end:ends[receiver],speed:runSpeed(receiver),stamina:stamina[receiver]});
 return contact?{...contact,receiver}:null;
}
function movePlayerTo(who,target,dt,speedFactor=1){
 if(!target)return true;const p=players[who].position,dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz);
 const move=Math.min(distance,runSpeed(who)*speedFactor*dt);if(distance>.001){p.x+=dx/distance*move;p.z+=dz/distance*move;energy.spend(who,move*2.2)}return distance-move<.025;
}
function recoverPlayers(dt,excluded=null){
 for(let who=0;who<2;who++){
  if(who===excluded||!recoveryTargets[who])continue;
  if(recoveryDelay[who]>0){recoveryDelay[who]=Math.max(0,recoveryDelay[who]-dt);continue}
  if(movePlayerTo(who,recoveryTargets[who],dt,.84))recoveryTargets[who]=null;
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
 players[server].position.set(sign*2,0,ends[server]*12.65);players[receiver].position.set(-sign*2.2,0,ends[receiver]*9);
 physicalBall.position.set(players[server].position.x,2.6,ends[server]*12.25);physicalBall.velocity.setZero();physicalBall.angularVelocity.setZero();physicalBall.force.setZero();physicalBall.torque.setZero();lastHitter=server;
 aim={x:-sign*2,z:-ends[server]*3.8};dirty=true;phase=server===0?'choose':'ai';aiWait=1.2;
 say(server===0?(serveAttempt===1?(match.serviceSide===0?'一区':'二区')+'发球 · 长按，瞄准高亮斜对角发球区':'二发机会 · 再次失误将失分'):'电脑'+(serveAttempt===2?'二发':'发球')+' · '+(match.serviceSide===0?'一区':'二区'));ui();
}
function finishPoint(who,reason){
 clearReturn();cancelHold();const result=match.award(who);energy.finishPoint(result.game);if(result.changeEnds){ends=ends.map(v=>-v);viewEnd()}
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
 if(e.body===netBody){netTouched=true;return}if(e.body!==floor)return;
 const p=physicalBall.position;
 if(isServe){
  const valid=validServiceLanding(p.x,p.z,ends[match.server],match.serviceSide);
  if(!valid){decision={type:'fault',reason:'未落入斜对角发球区'};return}
  if(netTouched){decision={type:'let'};return}isServe=false;bounces=1;return;
 }
 const onReceiver=p.z*ends[1-lastHitter]>0;
 if(bounces===0&&(Math.abs(p.x)>4.67||Math.abs(p.z)>12.17||!onReceiver))decision={type:'point',who:1-lastHitter,reason:onReceiver?'回球出界':'回球未过网'};
 else if(++bounces>=2)decision={type:'point',who:lastHitter,reason:'对手未能在第二次落地前回球'};
});
function strike(who,type,power,perfect=false){
 clearReturn();const serving=isServe;
 const pad=serving?(who===0?{...serveSpin}:servePad((Math.random()-.5)*1.4,serveAttempt===2?.65:Math.random()*.45)):null;
 if(serving)type=pad.y>.25?'top':'flat';
 const backhand=(physicalBall.position.x-players[who].position.x)*ends[who]<-.1;
 pendingStroke={who,type,power,perfect,pad,serving};phase='stroke';recoveryTargets[who]=null;plan=null;contactGuide.visible=false;acc=0;
 beginStroke(players[who],{type,backhand,serve:serving,pad});aimLine.visible=false;marker.visible=false;ui();
}
function launchStroke(who,type,power,perfect=false,pad=null,returnChoice=null){
 cancelHold();clearReturn();
 const serving=isServe,sign=ends[who]*(match.serviceSide===0?1:-1);
 let target=who===0?{...(returnChoice?.target||aim)}:serving?{x:-sign*(1.4+Math.random()*1.8),z:-ends[who]*(3.5+Math.random()*1.3)}:{x:(Math.random()-.5)*7,z:-ends[who]*(6+Math.random()*4)};
 if(who===0&&!perfect){target.x+=(Math.random()-.5)*Math.abs((returnChoice?.gauge??gauge)-.5)*2.4;target.z+=(power-65)*.022}
 target=fatigueTarget(target,stamina[who]);
 const shot=trajectory(who,type,target,power,perfect,pad);physicalBall.velocity.copy(shot.v);physicalBall.angularVelocity.set(shot.spin.x,shot.spin.y,shot.spin.z);physicalBall.force.setZero();physicalBall.torque.setZero();
 energy.spend(who,cost(power,type)*(perfect?.7:1));lastHitter=who;bounces=0;decision=null;netTouched=false;elapsed=0;acc=0;phase='flight';plan=predict();
 recoveryTargets[1-who]=null;recoveryTargets[who]=recoveryPosition({end:ends[who],opponentContact:plan?.ball||shot.landing||target,strikePosition:players[who].position});recoveryDelay[who]=.18;updateContactGuide();
 if(plan){
  rallyWindup={receiver:plan.receiver,started:false,choice:plan.receiver===1?{type:['top','flat','slice'][Math.floor(Math.random()*3)],power:45+Math.random()*30,perfect:false}:null};
  if(who===1){selected='flat';gauge=.5;aim={x:THREE.MathUtils.clamp(-plan.ball.x*.35,-4.2,4.2),z:-ends[0]*8};returnStrategy.open(currentReturnChoice());dirty=true;}
 }
 aimLine.visible=false;marker.visible=!!plan?.landing;if(marker.visible)marker.position.set(plan.landing.x,.015,plan.landing.z);
 say(perfect?'PERFECT ✦ 球速 +10% · 击球体力消耗 −30%':who===0?'电脑正在预判落点…':'对手已出球 · 来球途中长按选策略，提前松手锁定，到点自动击球');
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
  if(rallyWindup&&!rallyWindup.started&&plan.time-elapsed<=1.05*.42*.62){
   const choice=plan.receiver===0?returnStrategy.current(currentReturnChoice()):rallyWindup.choice;
   beginStroke(players[plan.receiver],{type:choice?.type||'flat',backhand:plan.backhand,serve:false});rallyWindup.started=true;
  }
  if(elapsed>=plan.time){
   const receiver=plan.receiver,p=players[receiver];
   if(Math.hypot(p.position.x-plan.x,p.position.z-plan.z)<.8){
    const choice=receiver===0?returnStrategy.resolve(currentReturnChoice()):rallyWindup?.choice||{type:'flat',power:65,perfect:false};
    const backhand=plan.backhand;marker.visible=false;contactGuide.visible=false;turn++;
    if(hold)retiredPointerId=hold.id;cancelHold();
    if(!players[receiver].userData.rig.swing)beginStroke(players[receiver],{type:choice.type,backhand,serve:false});
    const swing=players[receiver].userData.rig.swing;swing.type=choice.type;swing.backhand=backhand;swing.time=swing.duration*swing.contact;swing.hit=true;
    if(receiver===0){selected=choice.type;gauge=choice.gauge;aim={...choice.target}}
    pendingStroke=null;launchStroke(receiver,choice.type,choice.power,choice.perfect,null,receiver===0?choice:null);return;
   }
   plan=null;contactGuide.visible=false;clearReturn();cancelHold();
  }
 }
 if(elapsed>7||Math.abs(physicalBall.position.x)>18||Math.abs(physicalBall.position.z)>18){if(isServe)serviceFault('发球未能有效过网');else finishPoint(bounces?lastHitter:1-lastHitter,bounces?'未能回球':'击球出界')}
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
  placeCurrentGesture();wheel.hidden=false;hold.pressOrigin={x:hold.x,y:hold.y};updateNodes();say('↑ 上旋 / ↙ 平击 / ↘ 切削 · 右侧金色力量区松手 = PERFECT');
 }
 $('powerPanel').hidden=false;dirty=true;
}
function updateNodes(){wheel.querySelectorAll('[data-shot]').forEach(node=>node.classList.toggle('selected',node.dataset.shot===selected))}
function beginHold(e){if(e.isPrimary===false)return;if(!hold){retiredPointerId=null;ignoreNextClick=false}if(e.button!==0||!ready()||hold)return;if(e.currentTarget===canvas)aimAt(e);e.preventDefault();const surface=e.currentTarget;surface.setPointerCapture(e.pointerId);hold={surface,id:e.pointerId,pointerType:e.pointerType,x:e.clientX,y:e.clientY,ready:false,timer:setTimeout(showWheel,260)};}
function moveHold(e){
 if(!hold||e.pointerId!==hold.id)return;e.preventDefault();if(!hold.ready){if(hold.pointerType==='touch'){hold.x=e.clientX;hold.y=e.clientY;aimAt(e,true)}return}if(hold.mode==='serve'){serveSpin=servePad((e.clientX-hold.spinOrigin.x)/hold.radius,(hold.spinOrigin.y-e.clientY)/hold.radius);updateServeDial();dirty=true;return}const origin=screenLayout?.mobile||hold.pointerType==='touch'?hold.pressOrigin:hold.origin;
 const next=directionShot(e.clientX-origin.x,e.clientY-origin.y);if(next&&next!==selected){selected=next;dirty=true;updateNodes()}
}
function finishHold(e){
 if(!hold){if(e.pointerId===retiredPointerId){retiredPointerId=null;ignoreNextClick=true}return}
 if(e.pointerId!==hold.id)return;const didHold=hold.ready,isReturn=incomingReturn(),choice=currentReturnChoice();
 if(didHold)gauge=(1-Math.cos((performance.now()-hold.chargeStart)*.004))/2;
 cancelHold();if(!didHold){say('请长按至少 0.26 秒，拖动后松手锁定');return}
 if(isReturn){if(returnStrategy.lock(choice)){dirty=true;say('策略已锁定 · 到达腰部击球点自动执行');ui()}return}
 if(ready())strike(0,selected,Math.round(35+gauge*60),Math.abs(gauge-.5)<=.075);
}
for(const surface of [canvas]){surface.addEventListener('pointerdown',beginHold);surface.addEventListener('pointermove',moveHold);surface.addEventListener('pointerup',finishHold);surface.addEventListener('pointercancel',e=>{if(hold?.id===e.pointerId)cancelHold()});surface.addEventListener('lostpointercapture',()=>{if(hold?.surface===surface)cancelHold()});surface.addEventListener('contextmenu',e=>e.preventDefault())}
const ray=new THREE.Raycaster(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),intersection=new THREE.Vector3();
function aimAt(e,whilePress=false){if(!ready()||(hold&&!whilePress))return;const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);if(!ray.ray.intersectPlane(groundPlane,intersection))return;
 if(servingInput()){const sign=-ends[match.server]*(match.serviceSide===0?1:-1);aim={x:sign*THREE.MathUtils.clamp(intersection.x*sign,.4,4.1),z:-ends[0]*THREE.MathUtils.clamp(-intersection.z*ends[0],1,5.1)}}
 else aim={x:THREE.MathUtils.clamp(intersection.x,-4.2,4.2),z:-ends[0]*THREE.MathUtils.clamp(-intersection.z*ends[0],2,11.5)};dirty=true;
}
canvas.addEventListener('pointermove',e=>aimAt(e));
function updateVisuals(now,dt){
 if(incomingReturn()&&rallyWindup?.started){const swing=human.userData.rig.swing,choice=returnStrategy.current(currentReturnChoice(now));if(swing&&choice)swing.type=choice.type}
 const animationPaused=paused||!$('startMenu').hidden||!$('sideMenu').hidden;
 for(let i=0;i<2;i++){
  const contact=updatePlayer(players[i],animationPaused?0:dt,{end:ends[i],moving:!!recoveryTargets[i]||(phase==='flight'&&plan?.receiver===i),serveReady:isServe&&match.server===i&&['choose','ai'].includes(phase),ready:phase==='choose',paused:animationPaused});
  if(contact&&pendingStroke?.who===i){const shot=pendingStroke;pendingStroke=null;launchStroke(shot.who,shot.type,shot.power,shot.perfect,shot.pad)}
 }
 contactGuide.visible=!!plan&&phase==='flight'&&!animationPaused;
 updatePlayerEnergy(dt);
 shadow.position.set(physicalBall.position.x,-.015,physicalBall.position.z);shadow.scale.setScalar(1+physicalBall.position.y*.1);shadow.material.opacity=.3/(1+physicalBall.position.y*.25);
 if(hold?.ready&&!paused){const liveGauge=(1-Math.cos((now-hold.chargeStart)*.004))/2;if(Math.abs(liveGauge-gauge)>.02&&now-lastPreviewTime>100)dirty=true;gauge=liveGauge}
 const returnPreview=incomingReturn(),previewChoice=returnPreview?returnStrategy.current(currentReturnChoice(now)):null;
 aimLine.visible=(ready()||returnPreview)&&!animationPaused;
 if(aimLine.visible&&dirty&&now-lastPreviewTime>(screenLayout?.mobile?120:70)){
  dirty=false;lastPreviewTime=now;
  const shot=trajectory(0,previewChoice?.type||selected,previewChoice?.target||aim,previewChoice?.power||(hold?.ready?Math.round(35+gauge*60):65),previewChoice?previewChoice.perfect:!!hold?.ready&&Math.abs(gauge-.5)<=.075,servingInput()?serveSpin:null,returnPreview?plan.ball:null);
  aimLine.geometry.dispose();aimLine.geometry=new THREE.BufferGeometry().setFromPoints(shot.points);aimLine.computeLineDistances();marker.visible=true;marker.position.set(shot.landing?.x??aim.x,.015,shot.landing?.z??aim.z);
 }
 if(!['choose','flight'].includes(phase))marker.visible=false;
 if(hold?.ready&&!paused){gauge=(1-Math.cos((now-hold.chargeStart)*.004))/2;$('needle').style.bottom=(gauge*100)+'%';$('powerValue').textContent=Math.round(35+gauge*60)+'%';$('timingText').textContent=Math.abs(gauge-.5)<=.075?'✦ PERFECT':'金色区域松手'}
 ball.position.copy(physicalBall.position);ball.quaternion.copy(physicalBall.quaternion);
 if(isServe&&['choose','ai'].includes(phase))ball.position.y=1.3;
 if(pendingStroke?.serving){const u=strokeProgress(players[pendingStroke.who])||0;ball.position.y=1.3+1.3*Math.sin(Math.min(u/.72,1)*Math.PI/2);}
}
function next(){if(phase==='end'){openMenu();return}if(['point','fault'].includes(phase)&&!paused)prepareServe()}
canvas.addEventListener('click',e=>{if(e.isPrimary===false)return;if(ignoreNextClick){ignoreNextClick=false;return}if(paused&&$('startMenu').hidden&&$('sideMenu').hidden){togglePause();return}if(['point','fault','end'].includes(phase))next()});
function togglePause(){if(!started||!$('startMenu').hidden||!$('sideMenu').hidden)return;cancelHold();paused=!paused;say(paused?'已暂停 · P 或点击球场恢复比赛':phase==='choose'?'长按球场准备击球':'比赛继续');ui()}
addEventListener('keydown',e=>{if(hold?.ready&&hold.mode==='rally'&&['ArrowLeft','ArrowRight','ArrowUp'].includes(e.code)){e.preventDefault();selected=e.code==='ArrowUp'?'top':e.code==='ArrowLeft'?'flat':'slice';updateNodes();dirty=true;return}if(hold?.ready&&hold.mode==='serve'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.code)){e.preventDefault();serveSpin=e.code==='Home'?{x:0,y:0}:servePad(serveSpin.x+(e.code==='ArrowRight'?.2:e.code==='ArrowLeft'?-.2:0),serveSpin.y+(e.code==='ArrowUp'?.2:e.code==='ArrowDown'?-.2:0));updateServeDial();dirty=true;return}if(e.code==='Escape'&&started){if($('startMenu').hidden)openMenu();else $('resume').click();return}if(e.target.matches('input,select,button'))return;if(e.code==='KeyP')togglePause();if(e.code==='Space'){e.preventDefault();next()}});
function openMenu(){cancelHold();paused=true;$('startMenu').hidden=false;$('resume').hidden=!started||match.winner!==null;ui()}
$('resume').onclick=()=>{$('startMenu').hidden=true;paused=false;dirty=true;ui()};
$('setup').onsubmit=e=>{e.preventDefault();cancelHold();match=new TennisMatch({gamesToWin:Number($('gamesSetting').value),noAd:document.querySelector('input[name="scoring"]:checked').value==='golden'});difficulty=$('difficultySetting').value;started=true;paused=false;ends=[1,-1];viewEnd();energy.reset();stamina=energy.values;displayedStamina=[100,100];trailingStamina=[100,100];turn=1;serveAttempt=1;pendingStroke=null;for(const p of players)p.userData.rig.swing=null;$('startMenu').hidden=true;$('sideMenu').hidden=true;prepareServe()};
for(const node of document.querySelectorAll('[data-side]'))node.onclick=()=>{match.sideOverride=Number(node.dataset.side);$('sideMenu').hidden=true;prepareServe()};
addEventListener('blur',()=>{cancelHold();if(phase==='flight'||phase==='ai'||phase==='stroke'){paused=true;say('已暂停 · P 继续');ui()}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelHold();if(started&&['flight','ai','stroke'].includes(phase)){paused=true;ui()}}});
$('courtMenu').onclick=openMenu;
new ResizeObserver(resizeCourt).observe(arena);
let last=performance.now();function tick(now){requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.05);last=now;if(!paused&&$('startMenu').hidden){if(['stroke','flight'].includes(phase))energy.recover(dt);if(phase==='ai'){aiWait-=dt;if(aiWait<=0)strike(1,serveAttempt===2?'top':'flat',55+Math.random()*15)}else if(phase==='stroke'){recoverPlayers(dt*.62,pendingStroke?.who)}else if(phase==='flight'){acc+=dt*.62;while(acc>=1/240&&phase==='flight'){acc-=1/240;step(1/240)}ui()}}updateVisuals(now,dt);renderer.render(scene,camera)}
physicalBall.position.set(0,1.3,10);ui();requestAnimationFrame(tick);
