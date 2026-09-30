
const fs=require('fs'),vm=require('vm');
require('./harness.js');
vm.runInContext(fs.readFileSync('./engine.js','utf8'),vm.createContext(global),{filename:'engine.js'});
const X=global.__X, el=id=>document.getElementById(id);
const log=[];
try{
  X.wire(); X.hud(); log.push('boot+hud ok');
  X.show(X.N.start); log.push('show ok, band='+X.band());
  X.take(X.N.start.ch[0]); log.push('take -> trust='+X.S.trust+' susp='+X.S.susp);
  const d=X.typingDot(); X.clearDot(d); log.push('typingDot ok');
  el('msg').value='how is the rain'; X.send();  log.push('plain  susp='+X.S.susp);
  el('msg').value='the drop was at the safehouse'; X.send(); log.push('ops    susp='+X.S.susp);
  el('msg').value='i saw Anna yesterday'; X.send(); log.push('name   susp='+X.S.susp);
  X.musicPhase(2); log.push('music OFF-safe: trk="'+el('trk').textContent+'"');
  X.musicOn();  log.push('musicOn : "'+el('trk').textContent+'"');
  X.musicPhase(3); log.push('phase 3: "'+el('trk').textContent+'"');
  X.musicOff(); log.push('musicOff: "'+el('trk').textContent+'"');
  X.blood(3); X.bandCheck(); log.push('blood+bandCheck ok, band='+X.band());
  X.S.left=1; X.clockTick(); log.push('timeout fired, ended='+X.S.ended);
}catch(e){ log.push('THREW: '+e.message+' | '+e.stack.split('\n')[1].trim()); }
console.log(log.join('\n'));
