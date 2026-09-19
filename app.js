const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const rootStyle = document.documentElement.style;
let pointerFrame = 0;
document.addEventListener('pointermove',event=>{
  if(pointerFrame || reducedMotion.matches)return;
  pointerFrame=requestAnimationFrame(()=>{
    rootStyle.setProperty('--pointer-x',event.clientX+'px');
    rootStyle.setProperty('--pointer-y',event.clientY+'px');
    pointerFrame=0;
  });
},{passive:true});

const canvas=document.querySelector('#ambient-canvas');
if(canvas){
  const context=canvas.getContext('2d');
  let width=0,height=0,dpr=1,nodes=[],animationFrame=0;
  function reset(){
    width=window.innerWidth;height=window.innerHeight;dpr=Math.min(window.devicePixelRatio||1,1.75);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    context.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.max(22,Math.min(68,Math.round(width*height/24000)));
    nodes=Array.from({length:count},(_,index)=>({
      x:Math.random()*width,y:Math.random()*height,
      vx:(Math.random()-.5)*.14,vy:(Math.random()-.5)*.14,
      radius:index%5===0?1.35:.8,tone:index%4===0?'#9b7cff':'#57e5ff'
    }));
    draw();
  }
  function draw(){
    context.clearRect(0,0,width,height);
    context.beginPath();
    for(let i=0;i<nodes.length;i++){
      const a=nodes[i];
      for(let j=i+1;j<nodes.length;j++){
        const b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,distance=dx*dx+dy*dy;
        if(distance<12800){context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);}
      }
    }
    context.strokeStyle='rgba(87,229,255,.075)';context.lineWidth=.65;context.stroke();
    for(const node of nodes){
      context.beginPath();context.arc(node.x,node.y,node.radius,0,Math.PI*2);
      context.fillStyle=node.tone;context.globalAlpha=.52;context.fill();
      context.globalAlpha=1;
      if(!reducedMotion.matches){
        node.x+=node.vx;node.y+=node.vy;
        if(node.x<0||node.x>width)node.vx*=-1;
        if(node.y<0||node.y>height)node.vy*=-1;
      }
    }
  }
  function animate(){draw();animationFrame=requestAnimationFrame(animate);}
  function syncMotion(){
    cancelAnimationFrame(animationFrame);
    if(reducedMotion.matches){draw();animationFrame=0;}
    else if(!document.hidden)animate();
  }
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{reset();syncMotion();},120);},{passive:true});
  document.addEventListener('visibilitychange',syncMotion);
  reducedMotion.addEventListener?.('change',syncMotion);
  reset();syncMotion();
}

const revealItems=[...document.querySelectorAll('.directory-group,.page-heading,.post-header,.section-tree,.prose > h2')];
for(const item of revealItems)item.classList.add('reveal');
if(reducedMotion.matches||!('IntersectionObserver' in window)){
  for(const item of revealItems)item.classList.add('is-visible');
}else{
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
  },{rootMargin:'0px 0px -8% 0px',threshold:.06});
  for(const item of revealItems)observer.observe(item);
}

const menu = document.querySelector('.mobile-menu');
const sidebar = document.querySelector('.sidebar');
function closeMenu(){ sidebar.classList.remove('is-open'); menu.setAttribute('aria-expanded','false'); }
menu.addEventListener('click',()=>{const open=sidebar.classList.toggle('is-open');menu.setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',event=>{if(event.key==='Escape' && sidebar.classList.contains('is-open')){closeMenu();menu.focus();}});
document.addEventListener('click',event=>{if(!sidebar.contains(event.target)&&!menu.contains(event.target))closeMenu();});
const search = document.querySelector('#search');
if(search){
  const status=document.querySelector('.search-status'),results=document.querySelector('.search-results'),directory=document.querySelector('.directory-grid');
  let indexPromise,revision=0,timer;
  const loadIndex=()=>{
    if(!indexPromise)indexPromise=fetch('/search-index.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('Search index unavailable');return response.json();}).catch(error=>{indexPromise=null;throw error;});
    return indexPromise;
  };
  search.addEventListener('focus',()=>loadIndex().catch(()=>{}),{once:true});
  search.addEventListener('input',()=>{clearTimeout(timer);const version=++revision;timer=setTimeout(()=>run(version),120);});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&document.activeElement!==search){event.preventDefault();search.focus();}});
  async function run(version){
    const query=search.value.trim().toLowerCase();
    results.replaceChildren();results.hidden=!query;directory.hidden=!!query;status.textContent='';
    if(!query)return;
    status.textContent='正在搜索…';
    try{
      const index=await loadIndex();if(version!==revision)return;
      const terms=query.split(/\s+/);
      const matches=index.map(item=>({...item,score:terms.reduce((score,term)=>score+(item.title.toLowerCase().includes(term)?3:0),0)})).filter(item=>terms.every(term=>`${item.title} ${item.section} ${item.folder} ${item.text}`.toLowerCase().includes(term))).sort((a,b)=>b.score-a.score);
      status.textContent=matches.length?`找到 ${matches.length} 篇，显示前 ${Math.min(matches.length,50)} 篇`:'没有找到匹配的笔记，试试其他关键词。';
      for(const item of matches.slice(0,50)){
        const li=document.createElement('li'),a=document.createElement('a'),meta=document.createElement('p'),excerpt=document.createElement('p');
        a.href=item.url;a.textContent=item.title;meta.textContent=[item.section,item.folder].filter(Boolean).join(' / ');
        const position=item.text.toLowerCase().indexOf(terms[0]);const start=Math.max(0,position-25);
        excerpt.textContent=(start?'…':'')+item.text.slice(start,start+140)+(item.text.length>start+140?'…':'');
        li.append(a,meta,excerpt);results.append(li);
      }
    }catch{if(version===revision){status.textContent='搜索暂时不可用，请稍后重试；也可以按下方目录查阅。';results.hidden=true;directory.hidden=false;}}
  }
}
