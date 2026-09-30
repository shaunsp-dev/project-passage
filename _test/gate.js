// Splash gate test. Clicks the actual buttons - calling openLoginForm() directly
// would pass even if the click listener was never wired.
const fs=require('fs'),vm=require('vm');
const realST=setTimeout, realSI=setInterval;
const {ids}=require('./harness.js');
global.setTimeout=realST; global.setInterval=realSI;

vm.runInContext(fs.readFileSync('./engine.js','utf8'),vm.createContext(global),{filename:'e.js'});
const X=global.__X, el=id=>document.getElementById(id);
const out=[];
let fails=0;
function check(name,got,want){
  const ok=got===want;
  if(!ok) fails++;
  out.push(`${ok?'PASS':'FAIL'}  ${name}  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`);
}

check('splash present on load', !!el('seize'), true);
check('form hidden on load', el('loginForm').classList.contains('on'), false);
check('game not started on load', X.S.turn, 0);

// THE regression: a real click on the real button
el('loginBtn').click();
check('click reveals form', el('loginForm').classList.contains('on'), true);
check('click hides login button', el('loginBtn').style.display, 'none');
check('click sets status', el('authStatus').textContent, 'awaiting credentials...');
check('game still gated after first click', X.S.turn, 0);

el('authBtn').click();
realST(()=>{
  check('auth dismissed splash', el('seize').classList.contains('gone'), true);
  check('auth reached ACCESS GRANTED', el('authStatus').textContent, 'ACCESS GRANTED // opening relay...');
  check('game clock started', X.S.left > 1700, true);
  out.push(fails? `\n${fails} FAILED` : '\nall gate checks passed');
  console.log(out.join('\n'));
  process.exit(fails?1:0);
}, 3200);
