import {CONFIG as CFG} from './config.js';
import {selectContact,travelTime} from './tactics.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function selectComputerContact(samples,options){
  const contact=selectContact(samples,options);
  if(!contact||contact.reachable||options.stamina<CFG.ai.rescueMinimumStamina)return contact;
  const rescued=selectContact(samples,{...options,speed:options.speed*CFG.ai.rescueSpeedMultiplier});
  return rescued?.reachable?{...rescued,rescued:true,rescueSpeedFactor:CFG.ai.rescueSpeedMultiplier,rescueCost:CFG.ai.rescueStaminaCost}:contact;
}

// 每次引拍读取可见的站位与来球；不读取玩家锁定的下一拍，也不逐帧重掷随机数。
export function chooseComputerReturn({end,position,opponent,contact,remaining,speed,stamina=CFG.stamina.full,difficulty='normal'},random=Math.random){
  const a=CFG.ai,p=a.returnProfiles[difficulty]||a.returnProfiles.normal;
  const ball=contact.ball,width=CFG.court.halfWidth-p.widthMargin,depth=CFG.court.halfLength-p.depthMargin;
  const distance=Math.hypot(contact.x-position.x,contact.z-position.z);
  const setup=remaining-travelTime(distance,speed,stamina);
  const atNet=opponent.z*-end<=CFG.tactics.volleyDepth;
  const low=!contact.kind&&ball.y<a.defenseHeight;
  const pressured=contact.rescued||contact.reachable===false||setup<CFG.tactics.setupTime||stamina<CFG.stamina.lowThreshold||
    Math.abs(ball.x)>CFG.court.halfWidth-a.defenseWidthMargin||ball.z*end>CFG.court.halfLength+a.defenseDepthMargin||low;

  // 穿越比较球飞到对手纵深时的横向间距，而不只比较最终落点。
  function passingSide(){
    const progress=clamp((opponent.z-ball.z)/(-end*depth-ball.z),0,1);
    const gap=x=>Math.abs(ball.x+(x-ball.x)*progress-opponent.x);
    return gap(width)>gap(-width)?1:-1;
  }
  let tactic,type,power,x,z=-end*depth;
  if(pressured){
    tactic='defend';type=low?'slice':'top';power=p.defensePower;
    x=atNet?passingSide()*width:clamp(-ball.x*.3,-width*.5,width*.5);
    z=-end*(depth-.5);
  }else if(atNet){
    tactic='pass';type='flat';power=p.attackPower;x=passingSide()*width;
  }else if(Math.abs(opponent.x)>=p.openThreshold){
    tactic='open';type=ball.z*end<CFG.tactics.approachDepth?'flat':'top';power=p.attackPower;x=-Math.sign(opponent.x)*width;
  }else{
    tactic='backhand';type='top';power=p.controlPower;
    // 正反手由球员朝向决定；换边后反手侧也必须旋转。
    x=clamp(opponent.x+end*a.backhandOffset,-width,width);
  }
  type=contact.kind||type;
  const perfect=!pressured&&!contact.kind&&setup>=p.perfectSetup&&random()<p.perfectChance;
  const approach=!pressured&&!contact.kind&&ball.z*end<a.approachContactDepth&&Math.abs(opponent.x)>a.approachOpponentOffset&&stamina>=a.approachMinimumStamina;
  const scatter=p.scatter;
  const margin=CFG.shot.aimLineMargin;
  const target={
    x:clamp(x+(random()*2-1)*scatter,-CFG.court.halfWidth+margin,CFG.court.halfWidth-margin),
    z:-end*clamp(z*-end+(random()*2-1)*scatter,2,CFG.court.halfLength-margin),
  };
  power=clamp(power+(random()*2-1)*a.returnPowerJitter,CFG.input.minimumPower,CFG.input.minimumPower+CFG.input.powerRange);
  return {tactic,type,power,perfect,target,approach};
}
