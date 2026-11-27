/* 🎧 聽讀模式：一段一段念，念完停下來等指令（按鈕或語音）。
   指令：繼續／下一段、重複、上一段、下一節、停；「什麼是○○」「○○是什麼」「小卡○○」念名詞小卡；「快一點／慢一點」。 */
(function(){
  if(window.foxListen)return;
  const ss=window.speechSynthesis;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const SEL='h2,h3,h4,p,li,.lead>div,.lead,.oneline,.think,.warn,.eg,.nut,.note,figcaption,.path .step,.path .arr,tr,dd,dt,.bio>summary .one';
  const SKIP='nav,#quizsec,#biosum,svg,.en,.chnav,.modebar,#lisbar,.tblhint,.secbtn,script,style,header,footer';
  let segs=[],cur=-1,state='off',rate=1,voice=null,micOn=true,rec=null,recTries=0,queue=[],afterSpeak=null;
  try{rate=+localStorage.getItem('foxLisRate')||1;micOn=localStorage.getItem('foxLisMic')!=='0';}catch(_){}

  /* ---------- 文字轉成適合念的句子 ---------- */
  const MAP=[[/Na⁺\/K⁺/g,'鈉鉀'],[/H⁺\/K⁺/g,'氫鉀'],[/Na⁺/g,'鈉離子'],[/K⁺/g,'鉀離子'],[/Ca²⁺/g,'鈣離子'],[/Mg²⁺/g,'鎂離子'],[/Fe²⁺/g,'亞鐵離子'],[/Fe³⁺/g,'三價鐵離子'],[/Cl⁻/g,'氯離子'],[/HCO₃⁻/g,'碳酸氫根'],[/H₂CO₃/g,'碳酸'],[/H⁺/g,'氫離子'],[/NAD⁺/g,'NAD'],[/NADP⁺/g,'NADP'],[/FADH₂/g,'FADH2'],
    [/CO₂/g,'二氧化碳'],[/H₂O₂/g,'過氧化氫'],[/H₂O/g,'水'],[/O₂/g,'氧氣'],[/PO₂/g,'氧分壓'],[/PCO₂/g,'二氧化碳分壓'],[/NH₃/g,'氨'],[/NH₄⁺/g,'銨離子'],
    [/mg\/dL/g,'毫克每公合'],[/mmHg/g,'毫米汞柱'],[/mL\/min/g,'毫升每分鐘'],[/kcal/g,'大卡'],[/μg|µg/g,'微克'],[/\bmg\b/g,'毫克'],[/\bmL\b/g,'毫升'],[/\bkg\b/g,'公斤'],
    [/⇌/g,'可逆變成'],[/→/g,'，變成'],[/←/g,'，來自'],[/↑/g,'增加'],[/↓/g,'減少'],[/≈|≒/g,'約'],[/≥/g,'大於等於'],[/≤/g,'小於等於'],[/＞|>/g,'大於'],[/＜|</g,'小於'],
    [/(\d)\s*[–\-～~]\s*(\d)/g,'$1到$2'],[/×\s*(\d)/g,'乘以$1'],[/(\d)\s*[×x]\s*(\d)/g,'$1乘$2'],[/＋|\+/g,'加'],[/＝|=/g,'等於'],[/／/g,'或'],[/vs\.?/gi,'相對於'],
    [/α/g,'阿法'],[/β/g,'貝塔'],[/γ/g,'伽瑪'],[/δ/g,'德爾塔'],[/κ/g,'卡帕'],[/ω/g,'歐米伽'],
    [/[₀-₉]/g,c=>'0123456789'['₀₁₂₃₄₅₆₇₈₉'.indexOf(c)]],[/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,c=>'0123456789'['⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)]],[/[⁺⁻]/g,''],
    [/ⓘ|✓|✗|★|☆|•|·|□|☐|■/g,''],[/[|｜]/g,'，']];
  const say=t=>{
    t=t.replace(/（[^（）]*）|\([^()]*\)/g,m=>/[一-鿿]/.test(m)?m:'');   // 拿掉純英文的括號
    t=t.replace(/[A-Za-z][A-Za-z'’\-]*(?:[\s\/,]+[A-Za-z][A-Za-z'’\-]*)*/g,m=>/\b[a-z][a-z\-]{2,}\b/.test(m)?' ':m);  // 拿掉英文詞組（保留 ATP、NADH 這類縮寫與人名）
    for(const [a,b] of MAP)t=t.replace(a,b);
    return t.replace(/\s+/g,' ').replace(/([，。；：、])\s*[，、]/g,'$1').replace(/\s+([，。；：、）」])/g,'$1').replace(/（\s*）/g,'').replace(/^[，、\s]+/,'').trim();
  };
  const plain=el=>{const c=el.cloneNode(true);c.querySelectorAll('.en,.h3en,i.en-term,svg,.tblhint,sup,.lv,.lvkey,.sayi').forEach(x=>x.remove());
    c.querySelectorAll('br').forEach(b=>b.replaceWith('。'));return c.textContent;};
  const vis=el=>!!(el.offsetParent||el.getClientRects().length)&&getComputedStyle(el).visibility!=='hidden';
  const segText=el=>{
    const tag=el.tagName;
    if(tag==='TR'){
      if(el.classList.contains('thdr'))return '';
      const cs=[...el.cells];if(!cs.length)return '';
      if(cs.length===1)return say(plain(cs[0]));
      const t=el.closest('table');const hdr=t&&t.querySelector('tr.thdr');const labels=hdr?[...hdr.cells].map(c=>say(plain(c))):[];
      const allTh=cs.every(c=>c.tagName==='TH');if(allTh&&!hdr)return '';
      return cs.map((c,i)=>{const v=say(plain(c));if(!v)return '';if(i===0)return v+'：';return (labels[i]&&cs.length>2?labels[i]+'，':'')+v+'。';}).join('');
    }
    if(tag==='H2'){const no=el.querySelector('.no');const c=el.cloneNode(true);c.querySelector('.no')?.remove();return (no?'第 '+no.textContent.trim()+' 節，':'')+say(plain(c)).replace(/\s*[A-Za-z][\x00-\x7F]*$/,'');}
    if(tag==='H3'||tag==='H4')return '【'+say(plain(el)).replace(/\s+[A-Za-z][\x00-\x7F’'–—]*$/,'')+'】';
    if(el.matches('.lead>div')){const c=el.cloneNode(true);c.querySelectorAll('.lt').forEach(x=>x.append('：'));return say(plain(c));}
    if(el.matches('.path .arr'))return '接著，'+say(plain(el).replace(/^[\s↓→⬇]+/,''));
    if(el.matches('.think'))return '想一想：'+say(plain(el));
    if(el.matches('figcaption'))return '圖說：'+say(plain(el));
    if(el.matches('.oneline'))return '一句話重點：'+say(plain(el));
    return say(plain(el));
  };
  const collect=()=>{
    const main=document.querySelector('main');if(!main)return [];
    const enTbl=new Set([...main.querySelectorAll('table')].filter(t=>{const x=t.textContent.replace(/\s/g,'');const a=(x.match(/[A-Za-z]/g)||[]).length;return x.length&&a/x.length>.3;}));
    const all=[...main.querySelectorAll(SEL)].filter(el=>!el.closest(SKIP)&&vis(el)&&!(el.closest('table')&&enTbl.has(el.closest('table'))));
    const set=new Set(all);
    return all.filter(el=>{for(const d of el.querySelectorAll(SEL))if(set.has(d)&&d!==el)return false;  // 只取最內層
      if(el.tagName!=='TR'&&el.closest('tr'))return false; return true;})
      .map(el=>({el,text:segText(el)})).filter(s=>s.text&&s.text.replace(/[【】：，。\s]/g,'').length>1);
  };

  /* ---------- 說話 ---------- */
  const pickVoice=()=>{const v=(ss&&ss.getVoices())||[];
    voice=v.find(x=>/zh[-_]TW|cmn[-_]Hant/i.test(x.lang))||v.find(x=>/zh[-_]HK/i.test(x.lang)&&/Mandarin|國語/i.test(x.name))||v.find(x=>/^zh/i.test(x.lang))||null;};
  if(ss){pickVoice();ss.addEventListener?ss.addEventListener('voiceschanged',pickVoice):(ss.onvoiceschanged=pickVoice);}
  const chunks=t=>{const out=[];t.split(/(?<=[。！？；])/).forEach(p=>{p=p.trim();if(!p)return;while(p.length>110){let k=p.lastIndexOf('，',110);if(k<40)k=110;out.push(p.slice(0,k+1));p=p.slice(k+1);}if(p)out.push(p);});return out;};
  const speak=(text,done)=>{stopRec();ss.cancel();queue=chunks(text);afterSpeak=done;next();};
  const next=()=>{if(!queue.length){const d=afterSpeak;afterSpeak=null;d&&d();return;}
    const u=new SpeechSynthesisUtterance(queue.shift());u.lang='zh-TW';u.rate=rate;if(voice)u.voice=voice;
    u.onend=()=>{if(state==='speaking'||state==='card')next();};u.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled')tip('語音播放失敗（'+e.error+'），請改用手機的 Chrome 開啟。');};
    window._lisU=u;ss.speak(u);};

  /* ---------- 流程 ---------- */
  const mark=()=>{document.querySelectorAll('.lisnow').forEach(x=>x.classList.remove('lisnow'));const s=segs[cur];if(!s)return;
    s.el.classList.add('lisnow');const r=s.el.getBoundingClientRect();if(r.top<90||r.bottom>innerHeight-150)s.el.scrollIntoView({block:'center',behavior:'smooth'});};
  const play=i=>{if(i<0)i=0;if(i>=segs.length){state='wait';ui('全章念完了。說「上一段」或「重複」可以再聽，說「停」結束。');listen();return;}
    cur=i;mark();state='speaking';ui();speak(segs[cur].text,()=>{state='wait';ui();listen();});};
  const nextSection=()=>{for(let i=cur+1;i<segs.length;i++)if(/^H[23]$/.test(segs[i].el.tagName))return play(i);play(segs.length);};
  const readCard=(id,back)=>{const g=(typeof GL!=='undefined')&&GL[id];if(!g)return;
    const strip=h=>say(String(h||'').replace(/<[^>]+>/g,''));
    const name=strip(g.t).split(/\s+[A-Za-z]/)[0];
    let t='小卡：'+name+'。'+strip(g.d);if(g.m)t+='。記法：'+strip(g.m);
    if(!ss)return tip('這個瀏覽器不支援朗讀，請改用 Chrome 開啟。');
    if(state==='off'){state='card';speak(t,()=>{state='off';});return;}
    state='card';ui('正在念小卡：'+name);speak(t,()=>{state='wait';ui(segs.length?'小卡念完了。說「繼續」回到原本的段落。':'');if(segs.length)listen();});};
  /* 同音字容錯：語音辨識常把「柯氏」聽成「科氏、柯式」，用拼音比對 */
  const nz=p=>p.replace(/^zh/,'z').replace(/^ch/,'c').replace(/^sh/,'s').replace(/^n(?=[aeiou])/,'l').replace(/ing$/,'in').replace(/eng$/,'en').replace(/v/,'u');
  const toPy=t=>{const out=[];const P=window.FOX_PY||{};for(const ch of t){if(P[ch])out.push(nz(P[ch]));else if(/[A-Za-z0-9]/.test(ch))out.push(ch.toLowerCase());}return out;};
  let pyIdx=null;
  const buildIdx=()=>{pyIdx=[];const seen=new Set();const add0=(name,id)=>{if(!id||!/[\u4e00-\u9fff]/.test(name))return;const p=toPy(name.replace(/\s/g,''));if(p.length<2)return;const key=p.join(' ')+'|'+id;if(seen.has(key))return;seen.add(key);pyIdx.push({p,id,name});};const add=(n,id)=>variants(n).forEach(v=>add0(v,id));
    for(const k in GL_ALIAS)add(k,GL_ALIAS[k]);for(const id in GL)add(String(GL[id].t||'').replace(/<[^>]+>/g,'').split(/[\s（(]/)[0],id);};
  const pyFind=q=>{if(!window.FOX_PY)return null;if(!pyIdx)buildIdx();const u=toPy(q);if(!u.length)return null;let best=null,bestScore=0;
    for(const e of pyIdx){const L=e.p.length;if(L>u.length+1)continue;
      for(let i=0;i+L<=u.length;i++){let miss=0;for(let j=0;j<L;j++)if(u[i+j]!==e.p[j]&&++miss>(L>=4?1:0))break;
        if(miss<=(L>=4?1:0)){const sc=L*2-miss*3;if(sc>bestScore){bestScore=sc;best=e;}break;}}}
    return best?{id:best.id,L:best.p.length-(bestScore<best.p.length*2?1:0)}:null;};
  const variants=k=>{const v=[k.replace(/\s/g,'')];const t=k.replace(/[\s]*[A-Za-z0-9]+$/,'').replace(/\s/g,'');if(t&&t!==v[0])v.push(t);return v;};
  const EXTRA={'乳酸循環':'cori','柯里循環':'cori','檸檬酸循環':'krebs','三羧酸循環':'krebs'};
  const findCard=q=>{q=q.replace(/[，。？?！!\s]/g,'');if(!q||typeof GL_ALIAS==='undefined')return null;
    let best=null,bl=0;for(const k in EXTRA)if(q.includes(k)&&(typeof GL==='undefined'||GL[EXTRA[k]])&&k.length>bl){bl=k.length;best=EXTRA[k];}
    for(const k in GL_ALIAS){if(!GL_ALIAS[k])continue;for(const v of variants(k)){if(v.length<2)continue;if(q.includes(v)&&v.length>bl){bl=v.length;best=GL_ALIAS[k];}}}
    for(const id in GL){const n=(GL[id].t||'').replace(/<[^>]+>/g,'').split(/[\s（(]/)[0];if(n.length>=2&&q.includes(n)&&n.length>bl){bl=n.length;best=id;}}
    const p=pyFind(q);if(p&&p.L>bl)return p.id;   // 拼音比對到更長的名詞（例如聽錯字）時採用拼音結果
    return best||(p&&p.id)||null;};
  const command=raw=>{const t=raw.replace(/\s/g,'');ui('聽到：「'+raw+'」');
    let m=t.match(/(?:什麼是|甚麼是|小卡|解釋|說明)(.+)/)||t.match(/(.+?)(?:是什麼|是甚麼|是啥|的意思)/);
    if(m){const id=findCard(m[1]);if(id)return readCard(id);ui('找不到「'+m[1]+'」的小卡，可以換個說法再試一次。');return brief('找不到這張小卡，請再說一次');}
    if(/停止|停|結束|關掉|不聽/.test(t))return stop();
    if(/上一段|前一段|上一個|回去/.test(t))return play(cur-1);
    if(/重複|再一次|再念|重念|沒聽清楚|再說一次/.test(t))return play(cur);
    if(/下一節|下一個標題|跳過/.test(t))return nextSection();
    if(/快一點|快點|加快/.test(t)){setRate(Math.min(1.6,rate+.15));return play(cur);}
    if(/慢一點|慢點|放慢/.test(t)){setRate(Math.max(.6,rate-.15));return play(cur);}
    if(/繼續|下一段|下一個|好|可以|OK|ok|往下/.test(t))return play(cur+1);
    const id=findCard(t);if(id)return readCard(id);
    ui('沒聽懂「'+raw+'」。可以說：繼續、重複、上一段、什麼是○○、停');brief('沒聽懂，請再說一次');};
  const brief=t=>{state='card';speak(t,()=>{state='wait';listen();});};
  const setRate=r=>{rate=Math.round(r*100)/100;try{localStorage.setItem('foxLisRate',rate);}catch(_){}};

  /* ---------- 語音指令（只在等待時聽） ---------- */
  const stopRec=()=>{if(rec){rec.onend=null;try{rec.abort();}catch(_){}rec=null;}};
  const listen=()=>{if(!SR||!micOn||state!=='wait')return ui();recTries=0;startRec();};
  const startRec=()=>{stopRec();if(state!=='wait')return;
    try{rec=new SR();rec.lang='zh-TW';rec.interimResults=false;rec.maxAlternatives=3;rec.continuous=false;}catch(_){return;}
    let got=false;
    rec.onresult=e=>{got=true;const r=e.results[0];const alts=[...r].map(a=>a.transcript);const known=alts.find(a=>/繼續|下一|重複|再|上一|停|結束|什麼|甚麼|小卡|快|慢|好/.test(a))||alts.find(a=>findCard(a))||alts[0];stopRec();command(known);};
    rec.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){micOn=false;ui('麥克風沒有開放，請用下面的按鈕操作。');}};
    rec.onend=()=>{rec=null;if(!got&&state==='wait'&&micOn){if(++recTries<25)setTimeout(startRec,250);else ui('等太久了，麥克風先關掉；按 🎤 或「繼續」。');}};
    try{rec.start();ui();}catch(_){}};

  /* ---------- 介面 ---------- */
  let bar=null;
  const ensureBar=()=>{if(bar)return;bar=document.createElement('div');bar.id='lisbar';
    bar.innerHTML=`<div class="lisst"></div><div class="lisbtns">
      <button data-a="prev" title="上一段">⏮<span>上一段</span></button><button data-a="rep" title="重複">🔁<span>重複</span></button>
      <button data-a="go" class="lisgo">▶<span>繼續</span></button><button data-a="sec" title="下一節">⏭<span>下一節</span></button>
      <button data-a="mic" class="lismic">🎤</button><button data-a="rate" class="lisrate"></button><button data-a="stop" title="結束">✕</button></div>`;
    document.body.appendChild(bar);document.body.classList.add('listening');
    bar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;
      if(a==='go'){if(state==='speaking'||state==='card'){ss.cancel();queue=[];state='wait';ui();listen();}else play(cur+1);}
      else if(a==='prev')play(cur-1);else if(a==='rep')play(cur);else if(a==='sec')nextSection();else if(a==='stop')stop();
      else if(a==='mic'&&(state==='speaking'||state==='card')){ss.cancel();queue=[];state='wait';micOn=true;if(SR)listen();else ui();}
      else if(a==='mic'){micOn=!micOn;try{localStorage.setItem('foxLisMic',micOn?'1':'0');}catch(_){}if(micOn&&state==='wait')listen();else{stopRec();ui();}}
      else if(a==='rate'){setRate(rate>=1.3?0.8:rate+0.15>1.31?1.3:rate+0.15);ui();}});};
  const ui=msg=>{if(!bar)return;const st=bar.querySelector('.lisst');const go=bar.querySelector('.lisgo');
    const pos=segs.length?`第 ${cur+1}／${segs.length} 段`:'';
    go.innerHTML=(state==='speaking'||state==='card')?'⏸<span>暫停</span>':'▶<span>繼續</span>';
    bar.querySelector('.lismic').classList.toggle('on',!!(rec&&micOn));bar.querySelector('.lismic').style.display=SR?'':'none';
    bar.querySelector('.lismic').classList.toggle('off',!micOn);
    bar.querySelector('.lisrate').textContent=rate.toFixed(2).replace(/0$/,'')+'x';
    st.innerHTML=msg?msg:(state==='speaking'?`🔊 ${pos} 念讀中…（要發問先按 🎤）`:state==='card'?'🔊 念小卡中…':state==='wait'?(rec&&micOn?`${pos}　🎤 請說：<b>繼續</b>、重複、上一段、什麼是○○`:`${pos}　按 ▶ 繼續`):'');};
  const tip=t=>{window.foxTip?foxTip(t):alert(t);};
  const stop=()=>{state='off';stopRec();ss&&ss.cancel();queue=[];document.querySelectorAll('.lisnow').forEach(x=>x.classList.remove('lisnow'));
    if(bar){bar.remove();bar=null;}document.body.classList.remove('listening');};
  const loadPy=()=>{if(window.FOX_PY)return;const sc=document.createElement('script');sc.src='fox_py.js';document.head.appendChild(sc);};
  const start=()=>{loadPy();
    if(!ss||!window.SpeechSynthesisUtterance){tip('這個瀏覽器不支援朗讀。請點右上角「⋯」選「用預設瀏覽器開啟」，改用 Chrome 開啟。');return;}
    if(state!=='off'){stop();return;}
    pickVoice();segs=collect();if(!segs.length){tip('這一頁沒有可以朗讀的內容。');return;}
    let i=segs.findIndex(s=>s.el.getBoundingClientRect().top>=95);if(i<0)i=0;
    ensureBar();
    if(!voice)ui('找不到國語語音，會用預設聲音念。Android 可到「設定 → 文字轉語音」下載中文（台灣）。');
    play(i);};
  loadPy();
  window.foxListen={start,stop,readCard,_segs:()=>segs,_cmd:command};
})();
