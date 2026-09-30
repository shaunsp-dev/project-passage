
const fs=require('fs'),vm=require('vm');
// real timers for this test
const realST=setTimeout, realSI=setInterval;
require('./harness.js');
global.setTimeout=realST; global.setInterval=realSI;
vm.runInContext(fs.readFileSync('./engine.js','utf8'),vm.createContext(global),{filename:'e.js'});
const X=global.__X, el=id=>document.getElementById(id);
const out=[];
out.push('seize overlay present: '+!!el('seize'));
out.push('loginBtn present: '+!!el('loginBtn'));
out.push('form hidden at start: '+!el('loginForm').classList.contains('on'));
out.push('game idle before auth: turns='+X.S.turn+' trust='+X.S.trust);
X.openLoginForm();
out.push('form opens: '+el('loginForm').classList.contains('on'));
out.push('status: "'+el('authStatus').textContent+'"');
out.push('game STILL idle: turns='+X.S.turn);
X.authenticate().then(()=>{
  out.push('seize hidden after auth: '+el('seize').classList.contains('gone'));
  out.push('final status: "'+el('authStatus').textContent+'"');
  realST(()=>{
    out.push('game started: turns='+X.S.turn+' clock-left='+X.S.left);
    console.log(out.join('\n'));
    process.exit(0);
  },3000);
}).catch(e=>{ out.push('THREW '+e.message); console.log(out.join('\n')); process.exit(1); });
