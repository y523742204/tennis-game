import {CONFIG as CFG} from './config.js';

// 本地 Web Audio 合成，无下载资源。音色由拍面噪声、短低音和 Perfect 清脆提示组成。
export class TennisAudio {
  constructor(createContext=()=>{
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
    return Context?new Context():null;
  }){
    this.createContext=createContext;this.context=null;this.master=null;this.noise=null;
    this.enabled=CFG.audio.enabled;this.lastBounce=-Infinity;this.lastNet=-Infinity;
  }
  async unlock(){
    if(!this.enabled)return false;
    try{
      if(!this.context){
        this.context=this.createContext();if(!this.context)return false;
        this.master=this.context.createGain();this.master.gain.value=CFG.audio.volume;this.master.connect(this.context.destination);
        this.noise=this.context.createBuffer(1,Math.ceil(this.context.sampleRate*.3),this.context.sampleRate);
        const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      }
      if(this.context.state==='suspended')await this.context.resume();
      return this.context.state==='running';
    }catch{return false} // 禁止自动播放或不支持 Web Audio 时，游戏仍正常运行。
  }
  setEnabled(enabled){
    this.enabled=!!enabled;
    if(this.master)this.master.gain.setTargetAtTime(enabled?CFG.audio.volume:0,this.context.currentTime,.015);
  }
  get playable(){return this.enabled&&this.context?.state==='running'&&!!this.master}
  tone(frequency,duration,volume,type='sine',delay=0){
    const c=this.context,start=c.currentTime+delay,source=c.createOscillator(),gain=c.createGain();
    source.type=type;source.frequency.setValueAtTime(frequency,start);source.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*.45),start+duration);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.003);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    source.connect(gain);gain.connect(this.master);source.onended=()=>{source.disconnect();gain.disconnect()};source.start(start);source.stop(start+duration+.01);
  }
  impactNoise(duration,volume,frequency){
    const c=this.context,start=c.currentTime,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    source.buffer=this.noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;
    gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    source.connect(filter);filter.connect(gain);gain.connect(this.master);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};source.start(start);source.stop(start+duration);
  }
  hit({type='flat',serving=false,perfect=false,speed=120}={}){
    if(!this.playable)return;
    const a=CFG.audio,duration=perfect?a.perfectDuration:a.hitDuration,volume=a.hitVolume*Math.max(.4,Math.min(1,speed/180));
    const frequency=perfect?a.perfectFrequency:serving?a.serveFrequency:type==='slice'?a.sliceFrequency:type==='top'?a.topFrequency:a.hitFrequency;
    this.tone(frequency,duration,volume);this.impactNoise(duration*.65,volume*.75,perfect?2200:serving?1500:type==='slice'?3500:2000);
    if(perfect)this.tone(a.perfectChimeFrequency,.18,volume*.22,'sine',.015);
  }
  bounce(){
    if(!this.playable||this.context.currentTime-this.lastBounce<CFG.audio.bounceCooldown)return;
    this.lastBounce=this.context.currentTime;this.tone(CFG.audio.bounceFrequency,.065,CFG.audio.bounceVolume);this.impactNoise(.04,CFG.audio.bounceVolume*.4,900);
  }
  net(){
    if(!this.playable||this.context.currentTime-this.lastNet<CFG.audio.netCooldown)return;
    this.lastNet=this.context.currentTime;this.impactNoise(.12,CFG.audio.netVolume,650);this.tone(CFG.audio.netFrequency,.08,CFG.audio.netVolume*.4);
  }
  point(won){
    if(!this.playable)return;
    this.tone(won?520:350,.14,CFG.audio.pointVolume);this.tone(won?780:260,.18,CFG.audio.pointVolume,'sine',.1);
  }
}
