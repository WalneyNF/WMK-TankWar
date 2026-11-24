window.WMKMatchmaker=(()=>{
const sizes=[3,5,10,15];
const prefixes=["Aço","Lobo","Falcão","Bravo","Trovão","Sentinela","Corvo","Atlas","Nômade","Vigia","Cobalto","Urso","Eco","Titã","Sombra","Vento","Raptor","Granito","Orion","Vulcão","Puma","Lince","Cedro","Águia","Ferro","Névoa","Rubi","Delta","Muralha","Aurora"];
function create(catalog,player,size,rng=Math.random){
if(!sizes.includes(size)||!player||!catalog.some(t=>t.id===player.id))throw Error("Configuração inválida");
const pool=catalog.filter(t=>Math.abs(t.tier-player.tier)<=1);
if(!pool.length)throw Error("Sem veículos elegíveis");
const choose=a=>a[Math.min(a.length-1,Math.floor(rng()*a.length))];
const name=i=>prefixes[i%prefixes.length]+"_"+String(100+Math.floor(rng()*900))+"_"+(i+1);
const blue=[],red=[];const row=(tank,i,team)=>({name:name(i),tankId:tank.id,tier:tank.tier,class:tank.class,team,bot:true});
blue.push({name:"Você",tankId:player.id,tier:player.tier,class:player.class,team:"blue",bot:false});
red.push(row(choose(pool.filter(t=>t.tier===player.tier&&t.class===player.class)),0,"red"));
for(let i=1;i<size;i++){
const tiers=[player.tier,player.tier,player.tier-1,player.tier+1].filter(t=>pool.some(v=>v.tier===t));
const tier=choose(tiers),a=choose(pool.filter(t=>t.tier===tier));
const same=pool.filter(t=>t.tier===tier&&t.class===a.class);
blue.push(row(a,2*i-1,"blue"));red.push(row(choose(same),2*i,"red"));
}
const sum=a=>a.reduce((n,v)=>n+v.tier,0);
return {size,playerTier:player.tier,blue,red,blueScore:sum(blue),redScore:sum(red),tierDelta:Math.abs(sum(blue)-sum(red))};
}
function audit(m){const all=[...m.blue,...m.red];const count=(a,key)=>a.reduce((o,x)=>(o[x[key]]=(o[x[key]]||0)+1,o),{});const equal=key=>{const a=count(m.blue,key),b=count(m.red,key);return Object.keys({...a,...b}).every(k=>a[k]===b[k])};return m.blue.length===m.size&&m.red.length===m.size&&all.every(x=>Math.abs(x.tier-m.playerTier)<=1)&&new Set(all.map(x=>x.name)).size===all.length&&all.filter(x=>!x.bot).length===1&&m.tierDelta===0&&equal("tier")&&equal("class")}
return {create,audit,sizes}
})();