import {CONFIG as CFG} from './config.js';
import * as THREE from './vendor/three.module.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function viewportLayout(width,height,safe={},coarse=false){
  const inset={top:safe.top||0,right:safe.right||0,bottom:safe.bottom||0,left:safe.left||0};
  const mobile=coarse||width<=CFG.view.mobileWidth||height<=CFG.view.mobileHeight,portrait=height>=width;
  let left=inset.left+CFG.layout.edge,right=width-inset.right-CFG.layout.edge,top=inset.top+CFG.layout.top,bottom=height-inset.bottom-CFG.layout.bottom;
  if(mobile&&portrait){top=inset.top+CFG.layout.portraitTop;right=width-inset.right-CFG.layout.portraitRight;bottom=height-inset.bottom-CFG.layout.portraitBottom}
  if(mobile&&!portrait){left=inset.left+CFG.layout.landscapeLeft;right=width-inset.right-CFG.layout.landscapeRight;top=inset.top+CFG.layout.landscapeTop;bottom=height-inset.bottom-CFG.layout.landscapeBottom}
  // Even very small split-screen windows retain a usable drawing rectangle.
  if(right-left<CFG.layout.minimumWidth)left=inset.left+CFG.layout.fallbackLeft;
  if(bottom-top<CFG.layout.minimumHeight)top=inset.top+CFG.layout.fallbackTop;
  return {width,height,safe:inset,mobile,portrait,rect:{left,top,right,bottom},powerWidth:mobile?CFG.layout.mobilePowerWidth:CFG.layout.desktopPowerWidth};
}
export const courtBounds=[];
for(const x of [-(CFG.court.halfWidth+CFG.layout.floorSideMargin),CFG.court.halfWidth+CFG.layout.floorSideMargin])for(const z of [-(CFG.court.halfLength+CFG.layout.floorDepthMargin),CFG.court.halfLength+CFG.layout.floorDepthMargin])courtBounds.push(new THREE.Vector3(x,0,z));
for(const x of [-(CFG.court.halfWidth+CFG.layout.playerSideMargin),CFG.court.halfWidth+CFG.layout.playerSideMargin])for(const z of [-(CFG.court.halfLength+CFG.layout.playerDepthMargin),CFG.court.halfLength+CFG.layout.playerDepthMargin])courtBounds.push(new THREE.Vector3(x,CFG.layout.playerHeight,z));
export function fitCourtCamera(camera,layout,end=1){
  const {width,height,rect}=layout,cx=(rect.left+rect.right)/2,cy=(rect.top+rect.bottom)/2;
  camera.aspect=width/height;camera.far=CFG.view.cameraFar;camera.clearViewOffset();
  camera.setViewOffset(width,height,width/2-cx,height/2-cy,width,height);
  const point=new THREE.Vector3();
  function place(scale){camera.position.set(0,(layout.mobile&&layout.portrait?CFG.view.portraitCameraY:CFG.view.cameraY)*scale,(layout.mobile&&layout.portrait?CFG.view.portraitCameraZ:CFG.view.cameraZ)*scale*end);camera.lookAt(0,0,0);camera.updateMatrixWorld();camera.updateProjectionMatrix()}
  function fits(){return courtBounds.every(corner=>{point.copy(corner).project(camera);const x=(point.x+1)*width/2,y=(1-point.y)*height/2;return x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom})}
  let low=.45,high=5;
  for(let i=0;i<22;i++){const mid=(low+high)/2;place(mid);if(fits())high=mid;else low=mid}
  place(high*CFG.view.cameraPadding);return layout;
}
export function gesturePlacement(layout,x,y,kind){
  const dial=kind==='serve',baseWidth=dial?CFG.layout.serveSize:CFG.layout.shotWidth,baseHeight=dial?CFG.layout.serveSize:CFG.layout.shotHeight;
  const powerReserve=CFG.layout.gesturePowerWidth+CFG.layout.gesturePowerGap*2;
  const {width,height,safe}=layout,right=width-safe.right-Math.max(powerReserve,layout.mobile?CFG.layout.gestureMobileRight:CFG.layout.gestureDesktopRight),left=safe.left+CFG.layout.gestureLeft,top=safe.top+(dial?CFG.layout.serveTop:CFG.layout.shotTop),bottom=height-safe.bottom-CFG.layout.gestureBottom;
  const scale=Math.min(1,(right-left)/baseWidth,(bottom-top)/baseHeight);
  const w=baseWidth*scale,h=baseHeight*scale;
  return {scale,left:clamp(x-w/2,left,right-w),top:clamp(y-h/2,top,bottom-h),width:w,height:h};
}
export function directionShot(dx,dy){
  if(Math.hypot(dx,dy)<CFG.input.shotDragThreshold)return null;
  const vectors=[{type:'top',x:0,y:-1},{type:'flat',x:-Math.SQRT1_2,y:Math.SQRT1_2},{type:'slice',x:Math.SQRT1_2,y:Math.SQRT1_2}];
  return vectors.sort((a,b)=>(dx*b.x+dy*b.y)-(dx*a.x+dy*a.y))[0].type;
}
export function gesturePowerPlacement(layout,gesture){
  const {safe,width,height}=layout,gap=CFG.layout.gesturePowerGap;
  const w=CFG.layout.gesturePowerWidth,h=CFG.layout.gesturePowerHeight;
  const scale=Math.min(1,(height-safe.top-safe.bottom-gap*2)/h,(width-safe.left-safe.right-gap*2)/w);
  const pw=w*scale,ph=h*scale,right=width-safe.right-gap,left=safe.left+gap;
  const beside=gesture.left+gesture.width+gap;
  const x=beside+pw<=right?beside:gesture.left-gap-pw;
  return {left:clamp(x,left,right-pw),top:clamp(gesture.top+(gesture.height-ph)/2,safe.top+gap,height-safe.bottom-gap-ph),width:pw,height:ph,scale};
}
