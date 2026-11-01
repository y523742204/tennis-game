import * as THREE from './vendor/three.module.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function viewportLayout(width,height,safe={},coarse=false){
  const inset={top:safe.top||0,right:safe.right||0,bottom:safe.bottom||0,left:safe.left||0};
  const mobile=coarse||width<=900||height<=500,portrait=height>=width;
  let left=inset.left+12,right=width-inset.right-12,top=inset.top+16,bottom=height-inset.bottom-34;
  if(mobile&&portrait){top=inset.top+144;right=width-inset.right-64;bottom=height-inset.bottom-34}
  if(mobile&&!portrait){left=inset.left+194;right=width-inset.right-62;top=inset.top+12;bottom=height-inset.bottom-22}
  // Even very small split-screen windows retain a usable drawing rectangle.
  if(right-left<100)left=inset.left+8;
  if(bottom-top<130)top=inset.top+12;
  return {width,height,safe:inset,mobile,portrait,rect:{left,top,right,bottom},powerWidth:mobile?48:80};
}
export const courtBounds=[];
for(const x of [-7.2,7.2])for(const z of [-15.3,15.3])courtBounds.push(new THREE.Vector3(x,0,z));
for(const x of [-5.5,5.5])for(const z of [-14.5,14.5])courtBounds.push(new THREE.Vector3(x,2.7,z));
export function fitCourtCamera(camera,layout,end=1){
  const {width,height,rect}=layout,cx=(rect.left+rect.right)/2,cy=(rect.top+rect.bottom)/2;
  camera.aspect=width/height;camera.far=220;camera.clearViewOffset();
  camera.setViewOffset(width,height,width/2-cx,height/2-cy,width,height);
  const point=new THREE.Vector3();
  function place(scale){camera.position.set(0,(layout.mobile&&layout.portrait?32:20)*scale,(layout.mobile&&layout.portrait?17:27)*scale*end);camera.lookAt(0,0,0);camera.updateMatrixWorld();camera.updateProjectionMatrix()}
  function fits(){return courtBounds.every(corner=>{point.copy(corner).project(camera);const x=(point.x+1)*width/2,y=(1-point.y)*height/2;return x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom})}
  let low=.45,high=5;
  for(let i=0;i<22;i++){const mid=(low+high)/2;place(mid);if(fits())high=mid;else low=mid}
  place(high*1.012);return layout;
}
export function gesturePlacement(layout,x,y,kind){
  const dial=kind==='serve',baseWidth=dial?248:290,baseHeight=dial?248:265;
  const {width,height,safe}=layout,right=width-safe.right-(layout.mobile?64:104),left=safe.left+8,top=safe.top+(dial?36:18),bottom=height-safe.bottom-22;
  const scale=Math.min(1,(right-left)/baseWidth,(bottom-top)/baseHeight);
  const w=baseWidth*scale,h=baseHeight*scale;
  return {scale,left:clamp(x-w/2,left,right-w),top:clamp(y-h/2,top,bottom-h),width:w,height:h};
}
export function directionShot(dx,dy){
  if(Math.hypot(dx,dy)<18)return null;
  const vectors=[{type:'top',x:0,y:-1},{type:'flat',x:-Math.SQRT1_2,y:Math.SQRT1_2},{type:'slice',x:Math.SQRT1_2,y:Math.SQRT1_2}];
  return vectors.sort((a,b)=>(dx*b.x+dy*b.y)-(dx*a.x+dy*a.y))[0].type;
}
