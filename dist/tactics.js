const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const WAIST_HEIGHT=1.1;
export function travelTime(distance,speed,stamina=100) {
  if(distance<=0)return 0;
  const base=speed/(.45+.0055*stamina),decay=base*.0055*2.2;
  const tiring=Math.min(distance,stamina/2.2),remaining=distance-tiring;
  return Math.log(speed/Math.max(base*.45,speed-decay*tiring))/decay+remaining/(base*.45);
}
export function selectContact(samples,{position,end,speed,stamina=100}) {
  const candidates=[];
  for(const ball of samples){
    if(ball.bounces!==1||!ball.landing||ball.z*end<=1||ball.vz*end<=0)continue;
    const extension=Math.hypot(ball.x-ball.landing.x,ball.z-ball.landing.z);
    const afterBounce=ball.time-ball.landing.time;
    if(afterBounce<.12||extension<.7||ball.y<.4||ball.y>1.65)continue;
    // Stand behind and beside the ball: leave racket space on either wing.
    const stances=[{x:ball.x-.68*end,z:ball.z+.6*end,backhand:false},{x:ball.x+.68*end,z:ball.z+.6*end,backhand:true}];
    for(const stance of stances){
      const distance=Math.hypot(stance.x-position.x,stance.z-position.z);
      const setup=ball.time-travelTime(distance,speed,stamina);
      candidates.push({...stance,time:ball.time,ball,landing:ball.landing,distance,extension,setup,
        reachable:setup>=.1,waist:Math.abs(ball.y-WAIST_HEIGHT)<=.16&&extension>=1.05,
        score:Math.abs(ball.y-WAIST_HEIGHT)*6+distance*.035+ball.time*.025+(stance.backhand?.025:0)});
    }
  }
  if(!candidates.length)return null;
  // A reachable waist-height contact outranks an earlier low interception.
  const reachable=candidates.filter(c=>c.reachable);
  const pool=reachable.length?reachable:candidates;
  const waist=pool.filter(c=>c.waist),eligible=waist.length?waist:pool;
  // Ascending waist-height contact is preferred; late arrivals can use descent.
  const ascending=waist.filter(c=>c.ball.vy>=0);
  return (ascending.length?ascending:eligible).sort((a,b)=>a.score-b.score)[0];
}
export function recoveryPosition({end,opponentContact,strikePosition}) {
  const depth=Math.abs(strikePosition.z)<6?8.6:10.8,z=end*depth;
  const opponent=opponentContact||{x:0,z:-end*10};
  const baseline=end*12;
  const left={x:-4.5-opponent.x,z:baseline-opponent.z},right={x:4.5-opponent.x,z:baseline-opponent.z};
  const l=Math.hypot(left.x,left.z)||1,r=Math.hypot(right.x,right.z)||1;
  const bisector={x:left.x/l+right.x/r,z:left.z/l+right.z/r};
  const x=Math.abs(bisector.z)>.001?opponent.x+(z-opponent.z)*bisector.x/bisector.z:0;
  return {x:clamp(x,-2.8,2.8),z};
}
