// Definitive balance math. Loads the real engine graph.
const fs=require('fs'),path=require('path'),vm=require('vm');
require('./harness.js');
const js=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
const ctx=vm.createContext(global); vm.runInContext(js,ctx,{filename:'engine.js'});
const N=ctx.__X.N;

// choices only (no free transmit) - the graph is acyclic so this is exact
const TURN_CAP=24;
// Phase 1 contains a cycle (p1_oper -> p1_banter -> p1_flirt -> p1_oper),
// so enumeration must be state-keyed and turn-capped, not path-unique.
const acc=[]; const seen=new Set();
const vis={};
(function paths(id,tr,su,t){
  if(t>=TURN_CAP) return;
  const k=id+'|'+tr+'|'+su+'|'+t; if(seen.has(k)) return; seen.add(k);
  const n=N[id];
  if(n.end){ acc.push({end:id,tr,su,t}); return; }
  for(const c of (n.ch||[])){
    const revisit=(vis[c.to]||0)>0;
    vis[c.to]=(vis[c.to]||0)+1;
    // engine rule: a `once` back-edge into a seen node yields no trust
    const gain=(c.tr && !(c.once && revisit)) ? c.tr : 0;
    paths(c.to,
      Math.max(0,Math.min(100,tr+gain)),
      Math.max(0,Math.min(100,su+(c.su||0))),
      t+1);
  }
})('start',0,0,0);
const byEnd={};
for(const p of acc){ (byEnd[p.end]=byEnd[p.end]||[]).push(p); }
const summary={};
for(const [e,list] of Object.entries(byEnd)){
  summary[e]={
    routes:list.length,
    minTurns:Math.min(...list.map(p=>p.t)),
    maxTurns:Math.max(...list.map(p=>p.t)),
    trustRange:[Math.min(...list.map(p=>p.tr)),Math.max(...list.map(p=>p.tr))],
    suspRange:[Math.min(...list.map(p=>p.su)),Math.max(...list.map(p=>p.su))],
  };
}
// which routes satisfy the Defection gate (trust>=45 && susp<45) at p3_open?
function atCrossroads(tr,su,out){
  const n=N['p3_open'];
  for(const c of (n.ch||[])) out.push({to:c.to,tr,su,unlocked:c.to!=='end_together'||(tr>=45&&su<45)});
  return out;
}
const cross=[]; const cseen=new Set(); const cvis={};
// p3_open reachable states
// shortest-path BFS to the crossroads, then enumerate the states that land there
(function rec(id,tr,su,t){
  if(t>=20) return;
  const k=id+'|'+tr+'|'+su; if(cseen.has(k)) return; cseen.add(k);
  const n=N[id];
  if(!n||n.end) return;
  if(id==='p3_open'){ atCrossroads(tr,su,cross); return; }
  for(const c of (n.ch||[])){
    const revisit=(cvis[c.to]||0)>0; cvis[c.to]=(cvis[c.to]||0)+1;
    const gain=(c.tr && !(c.once && revisit)) ? c.tr : 0;
    rec(c.to, Math.max(0,Math.min(100,tr+gain)),
      Math.max(0,Math.min(100,su+(c.su||0))), t+1);
  }
})('start',0,0,0);

const unlocked=cross.filter(c=>c.unlocked);
const summaryCross={
  crossroadsStates:cross.length,
  unlockedTogether:unlocked.length,
  lockedTogether:cross.length-unlocked.length,
  maxTrustAtCrossroads:Math.max(...cross.map(c=>c.tr)),
  minSuspAtCrossroads:Math.min(...cross.map(c=>c.su)),
  bestUnlocked:unlocked.length?unlocked.reduce((a,b)=>b.tr>a.tr?b:a):null,
};
// suspicion ceilings with free transmit (14 each), turn-capped at 24
function maxSuspWithTx(maxTx){
  const seen=new Set(); const q=[['start',0,0,0]]; let m=0;
  while(q.length){
    const [id,su,tx,turns]=q.shift();
    if(turns>=TURN_CAP) continue;
    const k=id+'|'+su+'|'+tx+'|'+turns; if(seen.has(k))continue; seen.add(k);
    const n=N[id]; if(!n||n.end) continue;
    if(su>m)m=su;
    if(tx<maxTx) q.push([id,Math.max(0,Math.min(100,su+14)),tx+1,turns+1]);
    for(const c of (n.ch||[])) q.push([c.to,Math.max(0,Math.min(100,su+(c.su||0))),tx,turns+1]);
  }
  return m;
}
const bands={ choices_only:maxSuspWithTx(0), with_6_tx:maxSuspWithTx(6), with_18_tx:maxSuspWithTx(18) };

console.log(JSON.stringify({
  totalDistinctRoutes:acc.length,
  endingsReachable:Object.keys(byEnd).sort(),
  perEnding:summary,
  crossroads:summaryCross,
  suspicionBands:bands,
  verdict:{
    togetherReachable:unlocked.length>0,
    turnCapGenerous:Math.max(...Object.values(summary).map(s=>s.maxTurns))<24,
    band25Reachable:bands.with_6_tx>=25,
    band45Reachable:bands.with_6_tx>=45,
    band70Reachable:bands.with_18_tx>=70,
  }
},null,2));
