(()=>{const {esc}=window.MorphLab,C=window.CAT,G=window.GLOSS;
const SN={hands:'01 · The Hand',tactile:'02 · Touch',actuators:'03 · Muscle',body:'04 · The Body',brain:'05 · The Brain',data:'06 · Data',safety:'07 · Safety'};
const by={};C.forEach(e=>by[e.id]=e);
// backlinks: which entries point here
const back={};C.forEach(e=>e.r.forEach(r=>{(back[r]=back[r]||[]).push(e.id)}));
const kinds=['All',...new Set(C.map(e=>e.k))];const P=new URLSearchParams(location.search);let k=P.get('k')||'All',q='';
const f=document.getElementById('f'),g=document.getElementById('g'),n=document.getElementById('n'),qi=document.getElementById('q');
f.innerHTML=kinds.map(x=>`<button data-k="${x}">${x}${x==='All'?'':' · '+C.filter(e=>e.k===x).length}</button>`).join('');
f.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;k=b.dataset.k;history.replaceState(null,'',k==='All'?'catalogue.html':'catalogue.html?k='+encodeURIComponent(k));draw()};
qi.oninput=()=>{q=qi.value.toLowerCase();draw()};
const link=id=>by[id]?`<a href="#${id}" data-c="${id}">${esc(by[id].n)}</a>`:(G.find(x=>x.id===id)?`<a href="atelier.html#g-${id}">${esc(G.find(x=>x.id===id).t)}</a>`:'');
function draw(){f.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
const L=C.filter(e=>(k==='All'||e.k===k)&&(!q||(e.n+' '+e.d+' '+e.s.join(' ')+' '+e.k).toLowerCase().includes(q)));
n.textContent=L.length+' of '+C.length+' entries';
g.innerHTML=L.map(e=>`<article class="ent" id="${e.id}"><div class="meta"><span class="sc">${esc(e.k)}</span><span class="sc">${esc(e.y)}</span></div><h3>${esc(e.n)}</h3><ul>${e.s.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul><p>${esc(e.d)}</p>
<div class="lk"><a href="${e.u}" target="_blank" rel="noopener">Source ↗</a><a href="studies.html#${e.st}">Study ${SN[e.st]}</a></div>
<div class="lk" style="margin-top:6px"><span class="sc">Related</span>${[...new Set([...e.r,...(back[e.id]||[])])].map(link).join('')}</div></article>`).join('');
// re-bind previews for new links
g.querySelectorAll('a[data-c]').forEach(a=>a.dataset.pv='c');
if(location.hash){const t=document.getElementById(location.hash.slice(1));if(t&&!draw.done){draw.done=1;setTimeout(()=>t.scrollIntoView(),30)}}}
draw();addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(by[id]&&!document.getElementById(id)){k='All';q='';qi.value='';draw();document.getElementById(id).scrollIntoView()}});
})();
