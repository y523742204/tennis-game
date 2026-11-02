import {CONFIG as CFG} from './config.js';
import {courtDimensions} from './court.js';
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
const dimensions=courtDimensions();
dimensions.halfWidth=CFG.court.doublesHalfWidth+CFG.court.sideRun*CFG.view.visibleBufferFraction;
dimensions.halfLength=CFG.court.halfLength+CFG.court.runBack*CFG.view.visibleBufferFraction;
for(const x of [-(dimensions.halfWidth+CFG.layout.floorSideMargin),dimensions.halfWidth+CFG.layout.floorSideMargin])for(const z of [-(dimensions.halfLength+CFG.layout.floorDepthMargin),dimensions.halfLength+CFG.layout.floorDepthMargin])courtBounds.push(new THREE.Vector3(x,0,z));
for(const x of [-dimensions.halfWidth+CFG.court.playerBoundaryMargin,dimensions.halfWidth-CFG.court.playerBoundaryMargin])for(const z of [-dimensions.halfLength+CFG.court.playerBoundaryMargin,dimensions.halfLength-CFG.court.playerBoundaryMargin])courtBounds.push(new THREE.Vector3(x,CFG.layout.playerHeight,z));
export function fitCourtCamera(camera,layout,end=1){
  const {width,height,rect}=layout,cx=(rect.left+rect.right)/2,cy=(rect.top+rect.bottom)/2;
  camera.aspect=width/height;camera.far=CFG.view.cameraFar;camera.clearViewOffset();
  camera.setViewOffset(width,height,width/2-cx,height/2-cy,width,height);
  const point=new THREE.Vector3();
  function place(scale){camera.position.set(0,CFG.view.cameraY*scale,CFG.view.cameraZ*scale*end);camera.lookAt(0,0,0);camera.updateMatrixWorld();camera.updateProjectionMatrix()}
  function fits(){return courtBounds.every(corner=>{point.copy(corner).project(camera);const x=(point.x+1)*width/2,y=(1-point.y)*height/2;return x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom})}
  let low=.45,high=5;
  for(let i=0;i<22;i++){const mid=(low+high)/2;place(mid);if(fits())high=mid;else low=mid}
  place(high*CFG.view.cameraPadding);return layout;
}
export function gesturePlacement(layout,x,y,kind){
  const dial=kind==='serve',baseWidth=dial?CFG.layout.serveSize:CFG.layout.shotWidth,baseHeight=dial?CFG.layout.serveSize:CFG.layout.shotHeight;
  const {width,height,safe}=layout,right=width-safe.right-(layout.mobile?CFG.layout.gestureMobileRight:CFG.layout.gestureDesktopRight),left=safe.left+CFG.layout.gestureLeft,top=safe.top+(dial?CFG.layout.serveTop:CFG.layout.shotTop),bottom=height-safe.bottom-CFG.layout.gestureBottom;
  const scale=Math.min(1,(right-left)/baseWidth,(bottom-top)/baseHeight);
  const w=baseWidth*scale,h=baseHeight*scale;
  return {scale,left:clamp(x-w/2,left,right-w),top:clamp(y-(dial?baseHeight/2:140)*scale,top,bottom-h),width:w,height:h};
}
export function directionShot(dx,dy){
  if(Math.hypot(dx,dy)<CFG.input.shotDragThreshold)return null;
  const vectors=[{type:'top',x:0,y:-1},{type:'flat',x:-Math.SQRT1_2,y:Math.SQRT1_2},{type:'slice',x:Math.SQRT1_2,y:Math.SQRT1_2}];
  return vectors.sort((a,b)=>(dx*b.x+dy*b.y)-(dx*a.x+dy*a.y))[0].type;
}
export function gesturePowerPlacement(layout,target,avoid=null){
  const {safe,width,height}=layout,gap=CFG.layout.gesturePowerGap;
  const w=CFG.layout.gesturePowerWidth,h=CFG.layout.gesturePowerHeight;
  const top=Math.min(safe.top+CFG.layout.targetPowerTop,height-safe.bottom-h-gap);
  const scale=Math.min(1,(height-safe.top-safe.bottom-gap*2)/h,(width-safe.left-safe.right-gap*2)/w);
  const pw=w*scale,ph=h*scale,right=width-safe.right-gap,left=safe.left+gap;
  const beside=target.x+gap;
  const x=beside+pw<=right?beside:target.x-gap-pw;
  const place=(x,y)=>({left:clamp(x,left,right-pw),top:clamp(y,Math.max(safe.top+gap,top),height-safe.bottom-gap-ph),width:pw,height:ph,scale});
  const preferred=place(x,target.y-ph/2);
  if(!avoid)return preferred;
  const candidates=[preferred,place(avoid.left+avoid.width+gap,target.y-ph/2),place(avoid.left-gap-pw,target.y-ph/2),place(x,avoid.top+avoid.height+gap),place(x,avoid.top-gap-ph)];
  const overlap=p=>Math.max(0,Math.min(p.left+pw,avoid.left+avoid.width)-Math.max(p.left,avoid.left))*Math.max(0,Math.min(p.top+ph,avoid.top+avoid.height)-Math.max(p.top,avoid.top));
  const distance=p=>Math.hypot(p.left+pw/2-target.x,p.top+ph/2-target.y);
  return candidates.sort((a,b)=>overlap(a)-overlap(b)||distance(a)-distance(b))[0];
}
export function cancelsServe(layout,y){return y<=layout.safe.top+CFG.input.serveCancelTop}
