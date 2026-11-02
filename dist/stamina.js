const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export class Stamina {
  constructor(){this.reset()}
  reset(){this.values=[100,100];this.caps=[100,100];this.exhausted=[false,false]}
  spend(who,amount){
    this.values[who]=Math.max(0,this.values[who]-Math.max(0,amount));
    if(this.values[who]===0)this.exhausted[who]=true;
  }
  recover(dt){for(let i=0;i<2;i++)this.values[i]=Math.min(this.caps[i],this.values[i]+Math.max(0,dt)*2)}
  finishPoint(game=false){
    for(let i=0;i<2;i++){
      if(game)this.caps[i]=100;
      else if(this.exhausted[i])this.caps[i]*=.9;
      this.values[i]=this.caps[i];this.exhausted[i]=false;
    }
  }
}
export function staminaEffects(value){
  const energy=clamp(value,0,100),fatigue=1-clamp(energy/30,0,1);
  return {movement:.45+.55*energy/100,pace:1-.3*fatigue,scatter:1.6*fatigue*fatigue};
}
export function fatigueTarget(target,value,random=Math.random){
  const radius=Math.sqrt(random())*staminaEffects(value).scatter,angle=random()*Math.PI*2;
  return {x:target.x+Math.cos(angle)*radius,z:target.z+Math.sin(angle)*radius};
}
