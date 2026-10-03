(() => {
  const search=document.querySelector('#article-search'),list=document.querySelector('#article-list'),status=document.querySelector('#article-status'),filters=document.querySelector('.category-nav'),more=document.querySelector('.more-articles'),reset=document.querySelector('.reset-search');
  let catalog,loading,category=new URL(location.href).searchParams.get('category')||'all',limit=8;
  const featured=['/posts/cpp-lifetime/','/notes/3428c6a7ad967847/','/notes/36582d80df98846f/','/posts/cpp-container-concurrency/'];
  async function load(){
    if(loading)return loading;
    loading=(async()=>{try{
      const response=await fetch('/search-index.json');if(!response.ok)throw new Error('Index unavailable');const index=await response.json();
      const articles=index.map(item=>({...item,section:item.sectionId,sectionTitle:item.section}));
      const sectionMap=new Map();for(const article of articles){if(!sectionMap.has(article.section))sectionMap.set(article.section,{id:article.section,title:article.sectionTitle,count:0});sectionMap.get(article.section).count++;}
      catalog={articles,sections:[...sectionMap.values()]};
      filters.querySelectorAll('[data-category]:not([data-category=all])').forEach(button=>button.remove());
      for(const section of catalog.sections){const button=document.createElement('button');button.type='button';button.className='category';button.dataset.category=section.id;button.setAttribute('aria-pressed',String(category===section.id));button.append(document.createTextNode(section.title));const count=document.createElement('span');count.textContent=section.count;button.append(count);filters.append(button);}
      setCategory(catalog.sections.some(section=>section.id===category)?category:'all');
    }catch{catalog=null;status.textContent='文章索引暂时不可用';list.replaceChildren();const div=document.createElement('div');div.className='library-empty';const p=document.createElement('p');p.textContent='加载失败，可以重试。';const button=document.createElement('button');button.className='retry-articles';button.type='button';button.textContent='重新加载';button.addEventListener('click',()=>{loading=null;load();});div.append(p,button);list.append(div);more.hidden=true;}
    })();return loading;
  }
  function render(){
    if(!catalog)return;const terms=search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);list.replaceChildren();reset.hidden=category==='all'&&!terms.length;
    const rank=url=>{const index=featured.indexOf(url);return index<0?1000:index;};
    const matches=catalog.articles.filter(a=>(category==='all'||a.section===category)&&terms.every(term=>`${a.title} ${a.sectionTitle} ${a.folder} ${a.text}`.toLowerCase().includes(term))).sort((a,b)=>{const score=item=>terms.reduce((sum,term)=>sum+(item.title.toLowerCase().includes(term)?3:0),0);return score(b)-score(a)||rank(a.url)-rank(b.url);});
    status.textContent=`${terms.length?'找到 ':''}${matches.length} 篇${matches.length>limit?` · 展示 ${limit} 篇`:''}`;more.hidden=matches.length<=limit;
    for(const [index,item]of matches.slice(0,limit).entries()){
      const a=document.createElement('a');a.className='article-card';a.href=item.url;
      const meta=document.createElement('p');meta.className='article-meta';const number=document.createElement('span');number.className='article-number';number.textContent=String(index+1).padStart(2,'0');const topic=document.createElement('span');topic.textContent=item.sectionTitle;meta.append(number,topic);
      if(item.practiceLabel){const label=document.createElement('span');label.textContent=item.practiceLabel;meta.append(label);}
      const title=document.createElement('h3');title.textContent=item.title;const excerpt=document.createElement('p');excerpt.className='article-excerpt';excerpt.textContent=item.description||item.folder;const arrow=document.createElement('span');arrow.className='article-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');a.append(meta,title,excerpt,arrow);list.append(a);
    }
    if(!matches.length){const p=document.createElement('p');p.className='library-empty';p.textContent='没有找到匹配的文章，换个关键词或清除分类试试。';list.append(p);}
  }
  function setCategory(value){category=value;limit=8;for(const button of filters.querySelectorAll('button')){const active=button.dataset.category===value;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}render();}
  filters.addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(button)setCategory(button.dataset.category);});
  search.addEventListener('input',()=>{limit=8;render();});more.addEventListener('click',()=>{limit+=8;render();});reset.addEventListener('click',()=>{search.value='';setCategory('all');});
  function focusSearch(){document.querySelector('#articles').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});search.focus({preventScroll:true});load();}
  document.querySelector('.search-link').addEventListener('click',focusSearch);
  document.addEventListener('keydown',event=>{const editing=event.target.closest('input,textarea,select,[contenteditable]');if(event.key==='/'&&!editing&&!event.metaKey&&!event.ctrlKey&&!event.altKey){event.preventDefault();focusSearch();}if(event.key==='Escape'&&event.target===search){search.value='';limit=8;render();}});
  load();
})();
