const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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

async function copyText(text){
  if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(text);return;}
  const field=document.createElement('textarea');
  field.value=text;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';
  document.body.append(field);field.select();document.execCommand('copy');field.remove();
}
for(const block of document.querySelectorAll('.code-block')){
  const label=block.querySelector('.code-label'),code=block.querySelector('code');
  if(!label||!code)continue;
  const button=document.createElement('button');
  button.type='button';button.className='copy-code';button.textContent='复制';button.setAttribute('aria-label','复制代码');
  button.addEventListener('click',async()=>{
    try{
      await copyText(code.textContent);
      button.textContent='已复制';
      setTimeout(()=>{button.textContent='复制';},1600);
    }catch{button.textContent='复制失败';setTimeout(()=>{button.textContent='复制';},1600);}
  });
  label.append(button);
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
