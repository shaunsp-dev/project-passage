// Verifier: uses the real engine. Fixes the two harness artifacts
// (negative deltas clamped at 0; gate not applied in the old walker).
const fs=require('fs'), path=require('path'), vm=require('vm');
require('./harness.js');
const js=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
const ctx=vm.createContext(global);
vm.runInContext(js,ctx,{filename:'engine.js'});
const X=ctx.__X, N=X.N, S=X.S;

// gate helper mirrors the engine's own rule
const gatePass=(id)=>{ const n=N[id]; return !n.gate || n.gate(S); };
const cl=v=>Math.max(0,Math.min(100,v));

// --- max/min trust reachable at p3_open via choices only, honouring the gate ---
function bestTrust(){
  const memo={};
  function rec(id){
    if(1e9) return {tr:0,su:0,ok:false};
    if(memo[id]!==undefined) return memo[id];
    const n=N[id];
    if(n.end) return {tr:0,su:0,ok:id==='end_together'};
    const outs=(n.ch||[]).map(c=>{
      const r=rec(c.to);
      return {tr:(c.tr||0)+r.tr, su:(c.su||0)+r.su, ok:r.ok, to:c.to};
    }).filter(r=>r.ok!==false);
    if(!outs.length) return {tr:-999,su:999,ok:false};
    // prefer paths that actually reach end_together with a passing gate
    const joint=outs.find(r=>r.to==='end_together'&&r.tr>=45&&r.su<45);
    if(joint) return joint;
    const best=outs.reduce((a,b)=>(b.tr-a.tr>1?b:a));
    return best;
  }
  return rec('start');
}
function worstSusp(){
  const memo={};
  function rec(id){
    if(memo[id]!==undefined) return memo[id];
    const n=N[id];
    if(n.end) return {tr:0,su:0,ok:id==='end_compromised'};
    const outs=(n.ch||[]).map(c=>{
      const r=rec(c.to);
      return {tr:(c.tr||0)+r.tr, su:(c.su||0)+r.su, ok:r.ok, to:c.to};
    });
    if(!outs.length) return {tr:0,su:0,ok:false};
    const joint=outs.find(r=>r.to==='end_together'&&r.tr>=45&&r.su<45);
    if(joint) return joint;
    return outs.reduce((a,b)=>b.su-a.su>1?b:a);
  }
  return rec('start');
}

// --- full faithful playthrough: applies deltas + gate + turn cap, like take() ---
function play(pickFn, transmits=[]){
  Object.assign(S,{trust:0,susp:0,turn:0,ended:false,blocked:false,band:0,left:1800,memories:0,flags:{},visits:{}});
  S.node=N.start;
  let id='start', tx=0, log=[];
  for(let step=0; step<60; step++){
    const node=N[id];
    if(!node){ log.push('MISSING '+id); break; }
    if(node.end){ return {end:id,trust:S.trust,susp:S.susp,turns:S.turn,log}; }
    const ch=node.ch||[];
    if(!ch.length){ return {end:'DEAD-END:'+id,trust:S.trust,susp:S.susp,turns:S.turn,log}; }
    if(S.turn>=S.max) return {end:'TURN-CAP',trust:S.trust,susp:S.susp,turns:S.turn,log};
    const pick=pickFn(id,ch,S);
    const c=ch[pick];
    S.turn++;
    const revisit=(S.visits[c.to]||0)>0; S.visits[c.to]=(S.visits[c.to]||0)+1;
    const gain=(c.tr && !(c.once && revisit)) ? c.tr : 0;
    S.trust=cl(S.trust+gain);
    if(c.su)S.susp=cl(S.susp+c.su);
    if(c.flag)S.flags[c.flag]=true;
    let next=c.to;
    if(N[next].gate && !gatePass(next)){ log.push('gate-blocked '+next); next=N[next].fallback; }
    id=next;
    // interleave a free transmit (gives +2 trust) if queued
    if(transmits[tx] && S.turn%2===0){
      const raw=transmits[tx++];
      let risk=X.OPS.test(raw)?14:0;
      if(X.NAME.test(raw)) risk+=20;
      S.susp=Math.min(100,S.susp+risk);
      S.trust=Math.min(100,S.trust+2);
    }
  }
  return {end:'LOOP:'+id,trust:S.trust,susp:S.susp,turns:S.turn,log};
}

const trustMax=(id,ch)=>{ let b=0; ch.forEach((c,k)=>{
  const sc=(c.tr||0)-(c.su||0), bs=(ch[b].tr||0)-(ch[b].su||0); if(sc>bs)b=k; }); return b; };
const suspMax=(id,ch)=>{ let b=0; ch.forEach((c,k)=>{ if((c.su||0)>(ch[b].su||0))b=k; }); return b; };

const out={};
out.best_trust_no_transmit = play(trustMax);
out.best_trust_with_transmit = play(trustMax, Array(12).fill('how is the rain'));
out.worst_suspicion = play(suspMax);
out.worst_suspicion_with_transmit = play(suspMax, Array(12).fill('the drop was at the safehouse'));
out.best_trust_10_tx = play(trustMax, Array(10).fill('tell me about the lilies'));

// explicit: can a player reach the crossroads with trust>=45 and susp<45?
function canReachTogether(maxTx){
  // search over the graph with exact trust/susp at p3_open
  const seen=new Set(); let found=null;
  const q=[['start',0,0,0,0]];
  while(q.length && !found){
    const [id,tr,su,turns,tx]=q.shift();
    if(turns>=20||tx>maxTx) continue;
    const key=id+'|'+tr+'|'+su+'|'+turns+'|'+tx;
    if(seen.has(key)) continue; seen.add(key);
    const n=N[id]; if(!n||n.end) continue;
    if(id==='p3_open'){ if(tr>=45&&su<45) found={tr,su,turns,tx}; continue; }
    for(const c of (n.ch||[]))
      q.push([c.to,Math.max(0,Math.min(100,tr+(c.tr||0))),Math.max(0,Math.min(100,su+(c.su||0))),turns+1,tx]);
    if(tx<maxTx) q.push([id,Math.max(0,Math.min(100,tr+2)),su,turns+1,tx+1]);
  }
  return found;
}
out.together_with_0_tx = canReachTogether(0);
out.together_with_2_tx = canReachTogether(2);
out.together_with_4_tx = canReachTogether(4);
out.together_with_6_tx = canReachTogether(6);

// band boundaries actually reachable?
out.susp_thresholds={ p25:bestSusp25(), p45:bestSusp45(), p70:bestSusp70() };
function maxSusp(maxTx){
  // iterative BFS so depth can't blow the stack
  let m=0; const seen=new Set(); const q=[['start',0,0]];
  while(q.length){
    const [id,su,tx]=q.shift();
    const key=id+'|'+su+'|'+tx;
    if(seen.has(key)) continue; seen.add(key);
    const n=N[id]; if(!n||n.end) continue;
    if(su>m) m=su;
    if(tx<maxTx) q.push([id,Math.max(0,Math.min(100,su+14)),tx+1]);
    for(const c of (n.ch||[])) q.push([c.to,Math.max(0,Math.min(100,su+(c.su||0))),tx]);
  }
  return m;
}
function bestSusp25(){ return maxSusp(0); }
function bestSusp45(){ return maxSusp(12); }
function bestSusp70(){ return maxSusp(18); }

console.log(JSON.stringify(out,null,2));
