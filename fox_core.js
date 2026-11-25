const FOX_DONE=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
function setMode(m){
  document.body.classList.toggle('brief',m==='brief');
  document.getElementById('mBrief')?.classList.toggle('on',m==='brief');
  document.getElementById('mFull')?.classList.toggle('on',m==='full');
  try{localStorage.setItem('foxMode',m);}catch(e){}
  if(window.markGl)markGl();
}
document.querySelectorAll('.sec.det').forEach(sec=>{
  const b=document.createElement('button'); b.className='secbtn'; b.textContent='▼ 展開本節詳細內文';
  b.onclick=()=>{const o=sec.classList.toggle('open'); b.textContent=o?'▲ 收起本節詳細內文':'▼ 展開本節詳細內文'; if(window.markGl)markGl();};
  const one=sec.querySelector('.oneline'); if(one) one.after(b);
});
let saved='brief'; try{saved=localStorage.getItem('foxMode')||'brief';}catch(e){}
setMode(saved);
document.querySelectorAll('figure').forEach(f=>{f.addEventListener('click',()=>f.classList.toggle('zoom'));});

let answered=0, correct=0;
const box=document.getElementById('quiz');
if(box && typeof Q!=='undefined') Q.forEach((it,i)=>{
  const d=document.createElement('div'); d.className='q';
  d.innerHTML=`<div class="qt">${i+1}. ${it.q}</div>`;
  const exp=document.createElement('div'); exp.className='exp';
  it.o.forEach((t,j)=>{
    const b=document.createElement('button');
    b.textContent=String.fromCharCode(65+j)+'. '+t;
    b.onclick=()=>{
      if(d.dataset.done) return;
      d.dataset.done=1; answered++;
      const btns=d.querySelectorAll('button');
      btns[it.a].classList.add('ok');
      if(j===it.a){correct++; exp.innerHTML='<b>答對了！</b> '+it.e;}
      else{b.classList.add('ng'); exp.innerHTML='<b>答案是 '+String.fromCharCode(65+it.a)+'。</b> '+it.e;}
      exp.style.display='block';
      if(answered===Q.length) document.getElementById('score').textContent=`完成！答對 ${correct} / ${Q.length} 題`;
    };
    d.appendChild(b);
  });
  d.appendChild(exp); box.appendChild(d);
});

// ---- 章節導覽 ----
const FOX_CH=["人體功能的研究","人體的化學組成","細胞結構與基因調控","酵素與能量","細胞呼吸與代謝","細胞與細胞外環境的互動","神經系統","中樞神經系統","自主神經系統","感覺生理學","內分泌腺","肌肉","血液、心臟與循環","心輸出量、血流與血壓","免疫系統","呼吸生理學","腎臟生理學","消化系統","代謝的調節","生殖"];
(function(){
  const n=+document.body.dataset.ch; if(!n)return;
  const f=k=>`fox_ch${String(k).padStart(2,'0')}.html`;
  const nav=document.createElement('nav'); nav.className='chnav';
  nav.innerHTML=(n>1?`<a href="${f(n-1)}">← 第 ${n-1} 章 ${FOX_CH[n-2]}</a>`:'<span></span>')+
    `<a href="fox_index.html">目錄</a>`+(n<20?`<a href="${f(n+1)}">第 ${n+1} 章 ${FOX_CH[n]} →</a>`:'<span></span>');
  document.querySelector('main').appendChild(nav);
})();

// ---- 隨時可開的章節選單 ----
(function(){
  const n=+document.body.dataset.ch; if(!n)return;
  const f=k=>`fox_ch${String(k).padStart(2,'0')}.html`;
  const sh=document.createElement('div'); sh.id='chsheet';
  const secs=[...document.querySelectorAll('nav.toc a')].map(a=>
    `<a class="${a.classList.contains('sub')?'sub':''}" data-go="${a.getAttribute('href')}">${a.textContent}</a>`).join('');
  const chs=FOX_CH.map((t,i)=>{const k=i+1;
    if(k===n) return `<span class="cur">第 ${k} 章　${t}（本章）</span>`;
    return FOX_DONE.includes(k)?`<a href="${f(k)}">第 ${k} 章　${t}</a>`:`<span class="no">第 ${k} 章　${t}（製作中）</span>`;}).join('');
  sh.innerHTML=`<div class="box"><div class="hd"><b>章節選單</b><button class="x" aria-label="關閉">✕</button></div>
    <div class="tabs"><button class="on" data-t="s">本章小節</button><button data-t="c">全部章節</button></div>
    <div class="pane" data-p="s">${secs}<a data-go="#top">↑ 回到本章開頭</a></div>
    <div class="pane" data-p="c" hidden><a href="fox_index.html">📖 回目錄頁</a>${chs}</div></div>`;
  document.body.appendChild(sh);
  const open=()=>sh.classList.add('show'), close=()=>sh.classList.remove('show');
  sh.addEventListener('click',e=>{
    if(e.target===sh||e.target.closest('.x')) return close();
    const t=e.target.closest('[data-t]');
    if(t){sh.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b===t));
      sh.querySelectorAll('.pane').forEach(p=>p.hidden=p.dataset.p!==t.dataset.t); return;}
    const g=e.target.closest('[data-go]');
    if(g){e.preventDefault(); close(); const id=g.dataset.go.slice(1);
      const el=id==='top'?document.body:document.getElementById(id);
      if(el) setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),50);}
  });
  const mb=document.querySelector('.modebar');
  if(mb){const b=document.createElement('button'); b.className='chbtn'; b.textContent='☰ 章節'; b.onclick=open; mb.prepend(b);}
  const fab=document.createElement('button'); fab.className='chfab'; fab.textContent='☰'; fab.setAttribute('aria-label','章節選單'); fab.onclick=open;
  document.body.appendChild(fab);
  const top=document.querySelector('a.top');
  if(top) top.addEventListener('click',e=>{e.preventDefault(); window.scrollTo({top:0,behavior:'smooth'});});
})();

// ---- 全書搜尋、跳到該處、返回原處 ----
const FOX_NOT='#quizsec, nav, .chnav, #biosum, svg, .bh';
function foxBlocks(){return [...document.querySelectorAll('main p, main li, main td, main th, main figcaption, main dd, main dt, main div, main summary')].filter(e=>!e.closest(FOX_NOT)&&[...e.childNodes].some(n=>n.nodeType===3&&n.nodeValue.trim()));}
(function(){
  const blocks=foxBlocks;
  const file=location.pathname.split('/').pop()||'fox_index.html';
  const curCh=+document.body.dataset.ch||0;
  const fOf=k=>`fox_ch${String(k).padStart(2,'0')}.html`;
  const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let stack=[]; try{stack=JSON.parse(sessionStorage.getItem('foxBack')||'[]');}catch(e){}
  const save=()=>{try{sessionStorage.setItem('foxBack',JSON.stringify(stack));}catch(e){}};
  const here=()=>{const bl=blocks(); for(let i=0;i<bl.length;i++){const r=bl[i].getBoundingClientRect(); if(r.height&&r.bottom>90) return i;} return 0;};

  function reveal(el){
    let d=el.closest('details'); while(d){d.open=true; d=d.parentElement&&d.parentElement.closest('details');}
    if(!el.getClientRects().length){const sec=el.closest('.sec.det'); const b=sec&&sec.querySelector('.secbtn'); if(b&&!sec.classList.contains('open')) b.click();}
  }
  function mark(el,term){
    el.classList.add('hitblk'); setTimeout(()=>el.classList.remove('hitblk'),5000);
    if(!term) return; const lt=term.toLowerCase();
    const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); let n;
    while((n=w.nextNode())){const i=n.nodeValue.toLowerCase().indexOf(lt); if(i<0) continue;
      try{const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+term.length); const m=document.createElement('mark'); m.className='hit'; r.surroundContents(m);}catch(e){} break;}
  }
  function jump(i,term,hl){
    const el=blocks()[i]; if(!el) return; reveal(el);
    setTimeout(()=>{ if(window.markGl) markGl();
      window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-120});
      if(hl) mark(el,term);},80);
  }
  function go(f,i,term){
    stack.push({f:file,i:here(),c:curCh}); if(stack.length>10) stack.shift(); save();
    if(f===file){ jump(i,term,true); showBack(); }
    else location.href=f+'?go='+i+'&hl='+encodeURIComponent(term||'');
  }
  // 返回鈕
  const back=document.createElement('div'); back.className='backpill';
  back.innerHTML='<button class="bk"></button><button class="bx" aria-label="不用返回">✕</button>';
  document.body.appendChild(back);
  function showBack(){
    if(!stack.length){back.classList.remove('show'); return;}
    const p=stack[stack.length-1];
    back.querySelector('.bk').textContent='← 回到'+(p.c?`第 ${p.c} 章`:'目錄頁')+(innerWidth<600?'原處':'剛剛讀的地方');
    back.classList.add('show');
  }
  back.querySelector('.bk').onclick=()=>{const p=stack.pop(); save();
    if(p.f===file){ jump(p.i,null,false); showBack(); } else location.href=p.f+'?ret='+p.i;};
  back.querySelector('.bx').onclick=()=>{stack=[]; save(); showBack();};

  // 搜尋視窗
  const ss=document.createElement('div'); ss.id='srsheet';
  ss.innerHTML=`<div class="box"><div class="hd"><input type="search" placeholder="輸入名詞，例如：內在因子、B12" enterkeyhint="search" aria-label="搜尋全書"><button class="x" aria-label="關閉">✕</button></div>
    <div class="flt" hidden></div><div class="res"><p class="tip">可以搜尋中文或英文；結果會列出名詞小卡和各章出現的位置，點一下就會跳過去，讀完按左下角「回到…」就能回原處。</p></div></div>`;
  document.body.appendChild(ss);
  const inp=ss.querySelector('input'), res=ss.querySelector('.res'), flt=ss.querySelector('.flt');
  let onlyCh=0;
  const closeS=()=>ss.classList.remove('show');
  function loadIdx(cb){ if(window.FOX_IDX) return cb();
    res.innerHTML='<p class="tip">載入搜尋資料中…</p>';
    const s=document.createElement('script'); s.src='fox_search.js'; s.onload=cb;
    s.onerror=()=>{res.innerHTML='<p class="tip">搜尋資料載入失敗，請確認 fox_search.js 已一起上傳。</p>';}; document.head.appendChild(s);}
  function snip(t,i,L){const a=Math.max(0,i-22), b=Math.min(t.length,i+L+38);
    return (a>0?'…':'')+esc(t.slice(a,i))+'<mark>'+esc(t.slice(i,i+L))+'</mark>'+esc(t.slice(i+L,b))+(b<t.length?'…':'');}
  function run(){
    const q=inp.value.trim(); if(!q){res.innerHTML=''; return;}
    const lq=q.toLowerCase(); let h='';
    flt.hidden=!onlyCh; if(onlyCh) flt.innerHTML=`只看第 ${onlyCh} 章　<button>看全部章節</button>`;
    if(typeof GL!=='undefined' && !onlyCh){ const ids=[];
      for(const [k,v] of Object.entries(GL_ALIAS)) if(k.toLowerCase().includes(lq)&&!ids.includes(v)) ids.push(v);
      for(const [id,g] of Object.entries(GL)) if(!ids.includes(id)&&g.t&&g.t.toLowerCase().includes(lq)) ids.push(id);
      if(ids.length) h+='<div class="grp">名詞小卡</div>'+ids.slice(0,8).filter(id=>GL[id]).map(id=>`<a class="glr" data-id="${id}">📘 ${GL[id].t}</a>`).join('');}
    const order=[...Array(20).keys()].map(x=>x+1).sort((a,b)=>(b===curCh)-(a===curCh));
    let total=0;
    order.forEach(k=>{ if(onlyCh&&k!==onlyCh) return; const C=FOX_IDX[k]; if(!C) return; const hits=[];
      C.b.forEach(([i,l,t])=>{const p=t.toLowerCase().indexOf(lq); if(p>=0) hits.push([i,l,t,p]);});
      if(!hits.length) return; total+=hits.length;
      const lim=onlyCh?999:5;
      h+=`<div class="grp">第 ${k} 章　${FOX_CH[k-1]}${k===curCh?'（本章）':''}<span>${hits.length} 處</span></div>`+
        hits.map(([i,l,t,p],j)=>`<a class="hr${j>=lim?' more':''}" data-f="${fOf(k)}" data-i="${i}"><small>${esc(C.l[l]||'')}</small>${snip(t,p,q.length)}</a>`).join('')+
        (hits.length>lim?`<button class="mr">再顯示 ${hits.length-lim} 處</button>`:'');});
    if(!h) h='<p class="tip">找不到「'+esc(q)+'」。試試看較短的詞，或改用英文。</p>';
    res.innerHTML=h;
  }
  let tm; inp.addEventListener('input',()=>{clearTimeout(tm); tm=setTimeout(()=>loadIdx(run),250);});
  ss.addEventListener('click',e=>{
    if(e.target===ss||e.target.closest('.x')) return closeS();
    if(e.target.closest('.flt button')){onlyCh=0; return run();}
    const mr=e.target.closest('.mr'); if(mr){let n=mr.previousElementSibling; while(n&&n.classList.contains('hr')){n.classList.remove('more'); n=n.previousElementSibling;} mr.remove(); return;}
    const g=e.target.closest('.glr'); if(g){closeS(); if(window.openGl) openGl(g.dataset.id); return;}
    const r=e.target.closest('.hr'); if(r){e.preventDefault(); closeS(); go(r.dataset.f,+r.dataset.i,inp.value.trim());}
  });
  window.openSearch=(q,ch)=>{onlyCh=ch||0; if(q!=null) inp.value=q; ss.classList.add('show'); loadIdx(run); if(!q) setTimeout(()=>inp.focus(),50);};
  const mb=document.querySelector('.modebar');
  if(mb){const b=document.createElement('button'); b.className='srbtn'; b.textContent='🔍'; b.setAttribute('aria-label','搜尋全書'); b.onclick=()=>openSearch(); mb.querySelector('.chbtn')?mb.querySelector('.chbtn').after(b):mb.prepend(b);}
  if(curCh){const fab=document.createElement('button'); fab.className='chfab srfab'; fab.textContent='🔍'; fab.setAttribute('aria-label','搜尋全書'); fab.onclick=()=>openSearch(); document.body.appendChild(fab);}
  const chl=document.getElementById('chl');
  if(chl){const b=document.createElement('button'); b.className='srbar'; b.textContent='🔍 搜尋全書：輸入名詞，找出在哪一章、哪一段'; b.onclick=()=>openSearch(); chl.before(b);}
  // 進頁時處理跳轉／返回
  const P=new URLSearchParams(location.search);
  if(P.has('go')) jump(+P.get('go'),P.get('hl'),true);
  else if(P.has('ret')) jump(+P.get('ret'),null,false);
  if(P.has('go')||P.has('ret')) history.replaceState(null,'',file+location.hash);
  showBack();
})();
/* 手機閱讀改善：英文副標縮小、表格可左右滑、模式按鈕縮短、字級切換 */
(function(){
  const run=()=>{
    document.querySelectorAll('main h3').forEach(h=>{
      if(h.querySelector('.h3en'))return;
      const tn=[...h.childNodes].filter(n=>n.nodeType===3);const last=tn[tn.length-1];if(!last)return;
      const m=last.textContent.match(/^(.*?[^\x00-\x7F])\s+([A-Za-z][\x00-\x7F’'–—]*)$/);
      if(!m)return;last.textContent=m[1];const sp=document.createElement('span');sp.className='h3en';sp.textContent=m[2];h.insertBefore(sp,last.nextSibling);
    });
    const mark=()=>document.querySelectorAll('.tblwrap').forEach(w=>{
      w.classList.toggle('scroll',w.scrollWidth>w.clientWidth+4);
      if(!w.nextElementSibling||!w.nextElementSibling.classList.contains('tblhint')){const d=document.createElement('div');d.className='tblhint';d.textContent='← 表格可左右滑動 →';w.after(d);}
    });
    mark();addEventListener('resize',mark);document.addEventListener('click',()=>setTimeout(mark,50));
    const mb=document.querySelector('.modebar');
    if(mb){
      if(innerWidth<600){const b=document.getElementById('mBrief');if(b)b.textContent='精簡';}
      const fz=document.createElement('button');fz.className='fzbtn';
      const L={s:'字小',m:'字中',l:'字大'};let cur='m';try{cur=localStorage.getItem('foxFz')||'m';}catch(_){}
      const apply=()=>{document.body.classList.remove('fz-s','fz-l');if(cur!=='m')document.body.classList.add('fz-'+cur);fz.textContent='Aa '+L[cur];setTimeout(mark,50);};
      fz.onclick=()=>{cur={m:'s',s:'l',l:'m'}[cur];try{localStorage.setItem('foxFz',cur);}catch(_){}apply();};
      mb.appendChild(fz);apply();
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
