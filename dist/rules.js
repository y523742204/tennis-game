import {CONFIG as CFG} from './config.js';
export function serviceTargetSign(serverEnd, side) { return -serverEnd*(side===0?1:-1); }
export function validServiceLanding(x,z,serverEnd,side,radius=CFG.physics.ballRadius) {
  return x*serviceTargetSign(serverEnd,side)>=-radius&&Math.abs(x)<=CFG.court.halfWidth+radius&&z*serverEnd<=radius&&Math.abs(z)<=CFG.court.serviceDepth+radius;
}
export class TennisMatch {
  constructor({gamesToWin=CFG.match.gamesToWin, noAd=CFG.match.noAd}={}) {
    this.gamesToWin=gamesToWin; this.noAd=noAd;
    this.points=[0,0]; this.games=[0,0]; this.sets=[0,0];
    this.gameServer=0; this.tieBreak=false; this.winner=null; this.sideOverride=null;
  }
  get totalPoints(){return this.points[0]+this.points[1]}
  get decidingPoint(){return !this.tieBreak&&this.noAd&&this.points.every(p=>p===3)}
  get server(){
    if(!this.tieBreak||this.totalPoints===0)return this.gameServer;
    return (this.gameServer+Math.ceil(this.totalPoints/2))%2;
  }
  get serviceSide(){return this.decidingPoint&&this.sideOverride!==null?this.sideOverride:this.totalPoints%2}
  labels(){
    if(this.tieBreak)return this.points.map(String);
    if(this.points.every(p=>p>=3))return this.points.map((p,i)=>p>this.points[1-i]?'AD':'40');
    return this.points.map(p=>['0','15','30','40'][Math.min(p,3)]);
  }
  award(who){
    if(this.winner!==null)return {};
    this.points[who]++;this.sideOverride=null;
    const other=1-who, result={game:false,set:false,changeEnds:false};
    if(this.tieBreak){
      if(this.points[who]>=7&&this.points[who]-this.points[other]>=2){
        this.games[who]++;this.sets[who]++;this.winner=who;result.game=result.set=true;
      }else result.changeEnds=this.totalPoints%6===0;
      return result;
    }
    if(this.points[who]>=4&&(this.noAd||this.points[who]-this.points[other]>=2)){
      this.games[who]++;result.game=true;result.changeEnds=(this.games[0]+this.games[1])%2===1;
      this.points=[0,0];this.gameServer=1-this.gameServer;
      if(this.games[who]>=this.gamesToWin&&this.games[who]-this.games[other]>=2){this.winner=who;this.sets[who]++;result.set=true}
      else if(this.games.every(g=>g===this.gamesToWin))this.tieBreak=true;
    }
    return result;
  }
}
