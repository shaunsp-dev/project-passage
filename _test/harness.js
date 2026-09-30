// Headless DOM stub so the Passage engine can be exercised in node.
// No browser, no timers longer than a tick.
class El {
  constructor(tag='div'){ this.tagName=tag; this.children=[]; this.style={};
    this.classList={ _s:new Set(),
      add:(...c)=>c.forEach(x=>this.classList._s.add(x)),
      remove:(...c)=>c.forEach(x=>this.classList._s.delete(x)),
      contains:c=>this.classList._s.has(c) };
    this._html=''; this.textContent=''; this.value=''; this.disabled=false;
    this.offsetWidth=1; this.scrollTop=0; this.scrollHeight=0;
    this.dataset={}; this.pause=()=>{}; this.play=()=>Promise.resolve(); }
  set className(v){ this.classList._s=new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className(){ return [...this.classList._s].join(' '); }
  set innerHTML(v){ this._html=v; this.children=[]; }
  get innerHTML(){ return this._html; }
  get firstElementChild(){ return this.children[0]||null; }
  appendChild(c){ this.children.push(c); return c; }
  insertBefore(n){ /* cursor node: content is tracked in _typed */ return n; }
  addEventListener(type,fn){ (this._ev=this._ev||{})[type]=(this._ev[type]||[]).concat(fn); }
  removeChild(c){ this.children=this.children.filter(x=>x!==c); }
  remove(){}
  removeEventListener(type,fn){ if(this._ev&&this._ev[type]) this._ev[type]=this._ev[type].filter(f=>f!==fn); }
  set onclick(f){ this._click=f; } get onclick(){ return this._click; }
  // dispatch for real: a no-op addEventListener here hides dead buttons
  click(ev={}){ if(this.disabled) return;
    if(this._click) this._click(ev);
    (this._ev&&this._ev.click||[]).forEach(f=>f(ev)); }
  get text(){ return this._html||this.textContent; }
}
const ids={};
function seed(){
  // meter bars need a child <i> for firstElementChild
  for(const id of ['trustBar','suspBar','bgm']){
    const e=new El(); e.appendChild(new El('i')); ids[id]=e;
  }
}
seed();
global.document={
  getElementById(id){ return ids[id]||(ids[id]=new El()); },
  createElement(t){ return new El(t); },
  createTextNode(t){ return {nodeType:3,textContent:t,insertBefore(){},children:[]}; },
  addEventListener(type,fn){ (this._ev=this._ev||{})[type]=(this._ev[type]||[]).concat(fn); }
};
global.window={AudioContext:null,webkitAudioContext:null};
global.AudioContext=function(){ return {
  state:'running', currentTime:0, destination:{},
  createOscillator:()=>({type:'',frequency:{value:0},connect(){},start(){},stop(){}}),
  createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}})
};};
global.setTimeout=(fn,ms)=>{ if(ms===undefined) ms=0; return {id:0,fn,ms}; };
global.clearTimeout=()=>{};
global.setInterval=()=>({id:0});
global.clearInterval=()=>{};
global.requestAnimationFrame=()=>0;

module.exports={El,ids,seed};
