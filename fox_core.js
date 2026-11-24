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
