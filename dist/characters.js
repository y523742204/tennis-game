export const CHARACTERS=[
  {id:'runner',name:'无敌飞毛腿',stats:{M:6,T:4,D:4,J:4,F:2},colors:['#d9683a','#f1d36d'],build:.9},
  {id:'baseliner',name:'底线大魔王',stats:{M:4,T:6,D:4,J:2,F:4},colors:['#543d82','#c9a9ee'],build:1.08},
  {id:'striker',name:'暴力机关枪',stats:{M:4,T:4,D:6,J:2,F:4},colors:['#b53b35','#f2aa63'],build:1.03},
  {id:'finisher',name:'网前终结者',stats:{M:6,T:4,D:2,J:6,F:2},colors:['#176d68','#8bd4bf'],build:.94},
  {id:'server',name:'发球火箭筒',stats:{M:2,T:4,D:2,J:6,F:6},colors:['#315f9d','#9cc8ee'],build:1.12},
  {id:'guardian',name:'均衡守护者',stats:{M:4,T:4,D:4,J:4,F:4},colors:['#47734a','#d3df91'],build:1},
];
export const DEFAULT_CHARACTER='guardian';
export const characterById=id=>CHARACTERS.find(character=>character.id===id)||CHARACTERS.at(-1);
export const abilityFactor=(character,key,step=.08)=>1+(character.stats[key]-4)*step;
export const AXES=[{key:'M',label:'移动'},{key:'T',label:'体力'},{key:'D',label:'底线'},{key:'J',label:'截击'},{key:'F',label:'发球'}];
export const createCustomCharacter=(side='human')=>({id:`custom-${side}`,name:side==='human'?'我的选手':'自定义对手',stats:{M:4,T:4,D:4,J:4,F:4},colors:side==='human'?['#a85683','#efb9d3']:['#785a35','#e4bf7b'],build:1,custom:true});
export function adjustStats(current,key,requested){
  const stats={...current},target=Math.max(1,Math.min(6,Math.round(requested))),delta=target-stats[key];if(!delta)return stats;
  let remaining=Math.abs(delta);for(const axis of AXES.filter(axis=>axis.key!==key)){const available=delta>0?stats[axis.key]-1:6-stats[axis.key],change=Math.min(available,remaining);stats[axis.key]+=delta>0?-change:change;remaining-=change;if(!remaining)break}
  stats[key]+=(Math.abs(delta)-remaining)*Math.sign(delta);return stats;
}

const point=(index,value,radius=42)=>{
  const angle=-Math.PI/2+index*Math.PI*2/AXES.length,scale=value/6;
  return `${50+Math.cos(angle)*radius*scale},${50+Math.sin(angle)*radius*scale}`;
};
export function radarMarkup(character,{interactive=false}={}){
  const rings=[2,4,6].map(value=>`<polygon points="${AXES.map((_,i)=>point(i,value)).join(' ')}"/>`).join('');
  const spokes=AXES.map((axis,i)=>`<line x1="50" y1="50" x2="${point(i,6).replace(',', '" y2="')}"/><text x="${point(i,7.6).replace(',', '" y="')}" text-anchor="middle" dominant-baseline="middle">${axis.label}</text>`).join('');
  const value=AXES.map((axis,i)=>point(i,character.stats[axis.key])).join(' ');
  const handles=interactive?AXES.map((axis,i)=>`<circle class="radar-handle" data-axis="${axis.key}" cx="${point(i,character.stats[axis.key]).replace(',', '" cy="')}" r="3.8"><title>${axis.label}，拖动调整</title></circle>`).join(''):'';
  return `<svg class="ability-radar${interactive?' editable-radar':''}" viewBox="-10 -10 120 120" aria-label="五维能力图"><g class="radar-grid">${rings}${spokes}</g><polygon class="radar-value" points="${value}"/>${handles}</svg>`;
}
