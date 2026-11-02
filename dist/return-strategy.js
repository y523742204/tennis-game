const snapshot=choice=>({...choice,target:{...choice.target}});
// Selection and execution are separate: release locks a choice, contact consumes it.
export class ReturnStrategy {
  active=false;
  locked=null;
  fallback=null;
  open(fallback){this.active=true;this.locked=null;this.fallback=snapshot(fallback)}
  // 自己出拍开启新一拍；对手出拍只是进入来球阶段，不能覆盖提前锁定的选择。
  afterOwnShot(fallback){this.open(fallback)}
  opponentShot(fallback){if(!this.active)this.open(fallback)}
  lock(choice){if(!this.active||this.locked)return false;this.locked=snapshot(choice);return true}
  current(draft){return this.active?snapshot(this.locked||draft||this.fallback):null}
  resolve(draft){const choice=this.current(draft);this.close();return choice}
  close(){this.active=false;this.locked=null;this.fallback=null}
}
