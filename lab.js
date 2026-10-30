(()=>{const C={},G={};(window.CAT||[]).forEach(e=>C[e.id]=e);(window.GLOSS||[]).forEach(g=>G[g.id]=g);
const pv=document.createElement('div');pv.id='pv';document.body.appendChild(pv);
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
document.querySelectorAll('a[data-c]').forEach(a=>{const e=C[a.dataset.c];if(!e){a.removeAttribute('data-c');return}a.href='catalogue.html#'+e.id;a.dataset.pv='c'});
document.querySelectorAll('a[data-g]').forEach(a=>{const g=G[a.dataset.g];if(!g)return;a.classList.add('g');a.href=(location.pathname.endsWith('atelier.html')?'':'atelier.html')+'#g-'+g.id;a.dataset.pv='g'});
document.querySelectorAll('sup.fn a').forEach(a=>a.dataset.pv='f');
function html(a){const t=a.dataset.pv;if(t==='c'){const e=C[a.dataset.c];return `<div class="k">Catalogue · ${esc(e.k)} · ${esc(e.y)}</div><h5>${esc(e.n)}</h5>${esc(e.d)}<ul>${e.s.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul>`}
if(t==='g'){const g=G[a.dataset.g];return `<div class="k">Glossary</div><h5>${esc(g.t)}</h5>${esc(g.d)}`}
const li=document.getElementById(a.getAttribute('href').slice(1));return li?`<div class="k">Reference</div>${li.innerHTML}`:''}
function show(ev){const a=ev.target.closest('a[data-pv]');if(!a){pv.classList.remove('on');return}const h=html(a);if(!h)return;pv.innerHTML=h;pv.classList.add('on');const r=a.getBoundingClientRect();let x=Math.min(r.left,innerWidth-360),y=r.bottom+10;if(y+pv.offsetHeight>innerHeight)y=r.top-pv.offsetHeight-10;pv.style.left=Math.max(10,x)+'px';pv.style.top=y+'px'}
if(matchMedia('(hover:hover)').matches){document.addEventListener('mouseover',show);document.addEventListener('scroll',()=>pv.classList.remove('on'),{passive:true})}
window.MorphLab={C,G,esc};})();
