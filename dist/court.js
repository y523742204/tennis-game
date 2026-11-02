import {CONFIG as CFG} from './config.js';
// ITF 国际比赛建议最小总占地：36.57×18.29 米。
// https://itf.uberflip.com/i/1255985-facilities-guide/11
export function courtDimensions(){
  const c=CFG.court;
  return {halfWidth:c.doublesHalfWidth+c.sideRun,halfLength:c.halfLength+c.runBack,
    width:2*(c.doublesHalfWidth+c.sideRun),length:2*(c.halfLength+c.runBack)};
}
export function insidePlayerArea(position){
  const d=courtDimensions(),margin=CFG.court.playerBoundaryMargin;
  return Math.abs(position.x)<=d.halfWidth-margin&&Math.abs(position.z)<=d.halfLength-margin;
}
export function clampPlayerTarget(position){
  const d=courtDimensions(),margin=CFG.court.playerBoundaryMargin;
  return {x:Math.max(-d.halfWidth+margin,Math.min(d.halfWidth-margin,position.x)),z:Math.max(-d.halfLength+margin,Math.min(d.halfLength-margin,position.z))};
}
