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

const axes=['M','T','D','J','F'];
const point=(index,value,radius=42)=>{
  const angle=-Math.PI/2+index*Math.PI*2/axes.length,scale=value/6;
  return `${50+Math.cos(angle)*radius*scale},${50+Math.sin(angle)*radius*scale}`;
};
export function radarMarkup(character){
  const rings=[2,4,6].map(value=>`<polygon points="${axes.map((_,i)=>point(i,value)).join(' ')}"/>`).join('');
  const spokes=axes.map((axis,i)=>`<line x1="50" y1="50" x2="${point(i,6).replace(',', '" y2="')}"/><text x="${point(i,7.2).replace(',', '" y="')}" text-anchor="middle" dominant-baseline="middle">${axis}</text>`).join('');
  const value=axes.map((axis,i)=>point(i,character.stats[axis])).join(' ');
  return `<svg class="ability-radar" viewBox="0 0 100 100" aria-hidden="true"><g class="radar-grid">${rings}${spokes}</g><polygon class="radar-value" points="${value}"/></svg>`;
}
