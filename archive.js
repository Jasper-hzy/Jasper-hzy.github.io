(() => {
const pageDocument=window.document,host=pageDocument.querySelector('#directory-root');if(!host)return;
let root=host.shadowRoot;if(!root){const template=host.querySelector('template');if(!template)return;root=host.attachShadow({mode:'open'});root.append(template.content.cloneNode(true));template.remove();}
const document=root;

const articles=JSON.parse(document.querySelector('#archive-data').textContent);
const descriptions={
'系统启动流程':'从 Bootloader、Kernel 到 init、Zygote 与 system_server，梳理 Android 启动链路，以及各个进程与服务之间的职责。',
'ART：JIT / AOT / Profile / GC':'理解代码如何执行、热点如何被记录，以及 Profile 如何参与编译优化。区分安装、首次启动与后续运行的作用边界。',
'SystemServer 启动服务流程':'沿服务依赖与 boot phase，理解系统如何从服务初始化逐步进入可交互状态。',
'PackageManagerService 包扫描与安装流程':'从开机扫描到安装更新，串联包状态、Manifest 解析与组件发现，理解 PMS 如何支撑应用启动。',
'ATMS 与 AMS':'区分任务、Activity 与进程的管理职责，沿一次启动请求梳理系统服务和应用进程之间的协作。'};
let selected=[],limit=8;const expanded=new Set();
const tree={key:[],title:'全部文章',count:articles.length,children:[]};
for(const a of articles){let node=tree;for(const [i,part]of [a.section,...a.folders].entries()){let child=node.children.find(c=>c.part===part);if(!child){child={part,title:i===0?a.sectionTitle:part,key:[...node.key,part],count:0,children:[]};node.children.push(child);}child.count++;node=child;}}
const key=a=>a.join('/'),equal=(a,b)=>key(a)===key(b),isUnder=(a,b)=>b.every((s,i)=>a[i]===s),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getNode(path){let n=tree;for(const part of path)n=n.children.find(c=>c.part===part);return n;}
function category(node){const opened=expanded.has(key(node.key)),children=node.children.length,root=node.key.length===1;return '<li class="tree-node depth-'+node.key.length+'"><div class="cat-row"><button class="category" data-select="'+escape(key(node.key))+'">'+(root?'<span class="chapter-number" aria-hidden="true">'+String(tree.children.indexOf(node)+1).padStart(2,'0')+'</span>':'')+'<span class="cat-label">'+escape(node.title)+'</span>'+(!root?'<span class="branch-count" aria-label="'+node.count+'篇文章">'+node.count+'</span>':'')+'</button>'+(children?'<button class="toggle" data-toggle="'+escape(key(node.key))+'" aria-expanded="'+opened+'" aria-controls="branch-'+escape(key(node.key))+'" aria-label="'+(opened?'收起':'展开')+escape(node.title)+'"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg></button>':'')+'</div>'+(children?'<div class="branch" id="branch-'+escape(key(node.key))+'" data-open="'+opened+'" aria-hidden="'+!opened+'" '+(!opened?'inert':'')+'><div class="branch-clip"><ul>'+node.children.map(category).join('')+'</ul></div></div>':'')+'</li>';}
function syncTree(){
 for(const button of document.querySelectorAll('#tree [data-select]')){const path=button.dataset.select?button.dataset.select.split('/'):[],active=equal(path,selected),ancestor=path.length>0&&isUnder(selected,path),row=button.closest('.cat-row');row.classList.toggle('selected',active);row.classList.toggle('ancestor',ancestor&&!active);button.closest('li').classList.toggle('active-path',ancestor);if(active)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');}
 for(const button of document.querySelectorAll('#tree [data-toggle]')){const k=button.dataset.toggle,opened=expanded.has(k),branch=document.getElementById('branch-'+k);button.setAttribute('aria-expanded',String(opened));button.setAttribute('aria-label',(opened?'收起':'展开')+getNode(k.split('/')).title);branch.dataset.open=String(opened);branch.inert=!opened;branch.setAttribute('aria-hidden',String(!opened));}
}
function renderTree(){const target=document.querySelector('#tree');if(!target.children.length)target.innerHTML='<li class="all-row"><div class="cat-row"><span class="spacer"></span><button class="category" data-select=""><span>全部文章</span><span class="count">'+articles.length+'</span></button></div></li>'+tree.children.map(category).join('');syncTree();}
function render(){const node=getNode(selected),query=document.querySelector('#search').value.trim().toLowerCase();renderTree();
const matches=articles.filter(a=>isUnder([a.section,...a.folders],selected)&&(!query||query.split(/\s+/).every(term=>(a.title+' '+a.sectionTitle+' '+a.folders.join(' ')+' '+a.description+' '+a.text).toLowerCase().includes(term))));
document.querySelector('#title').textContent=node.title;document.querySelector('#count').textContent=matches.length+' 篇';document.querySelector('#search').placeholder='在「'+node.title+'」中搜索';document.querySelector('#intro').textContent=key(selected)==='client/Android/系统原理'?'从系统启动到应用运行，理解 Android 各条核心链路。':selected.length?'沿当前主题浏览文章，或继续展开子分类。':'技术原理、工程实践与算法练习，按主题有序归档。';
document.querySelector('#breadcrumb').innerHTML='<button data-select="">全部文章</button>'+selected.map((s,i)=>'<i>/</i>'+(i===selected.length-1?'<span>'+escape(getNode(selected.slice(0,i+1)).title)+'</span>':'<button data-select="'+escape(key(selected.slice(0,i+1)))+'">'+escape(getNode(selected.slice(0,i+1)).title)+'</button>')).join('');
const levels=[];for(let depth=1;depth<=selected.length;depth++){const parent=getNode(selected.slice(0,depth));if(!parent.children.length)continue;levels.push('<div class="topic-level"><span class="level-label">'+(depth===1?'方向':'专题')+'</span><button data-select="'+escape(key(parent.key))+'" '+(selected.length===depth?'aria-current="true"':'')+'>全部</button>'+parent.children.map(c=>'<button data-select="'+escape(key(c.key))+'" '+(selected[depth]===c.part?'aria-current="true"':'')+'>'+escape(c.title)+'</button>').join('')+'</div>');}document.querySelector('#subtopics').innerHTML=levels.join('');
document.querySelector('#archive-list').innerHTML=matches.slice(0,limit).map((a,i)=>'<a class="article" href="'+a.url+'"><div class="meta"><span class="number">'+String(i+1).padStart(2,'0')+'</span><span>'+escape(a.folders.join(' / ')||a.sectionTitle)+'</span>'+(a.practiceLabel?'<span>'+escape(a.practiceLabel)+'</span>':'')+'</div><h3>'+escape(a.title)+'</h3><p>'+escape(descriptions[a.title]||a.description||'围绕具体问题梳理原理、实现方式与适用边界。')+'</p><span class="arrow">↗</span></a>').join('')||'<p class="empty">当前分类下没有匹配的文章。</p>';document.querySelector('#more').hidden=matches.length<=limit;}
function revealSelected(){for(const k of [...expanded])if(k.split('/')[0]!==selected[0])expanded.delete(k);for(let i=1;i<=selected.length;i++)expanded.add(key(selected.slice(0,i)));}
function updateUrl(replace=false){const url=new URL(location);url.search='';if(selected.length)url.searchParams.set('category',selected[0]);if(selected.length>1)url.searchParams.set('folder',selected.slice(1).join('/'));const query=document.querySelector('#search').value;if(query)url.searchParams.set('q',query);history[replace?'replaceState':'pushState']({},'',url);}
function readUrl(){const params=new URLSearchParams(location.search);if(!params.has('category')&&!params.has('folder'))selected=[];else{const candidate=[params.get('category'),...(params.get('folder')||'').split('/').filter(Boolean)];let parent=tree;selected=[];for(const part of candidate){const child=parent.children.find(n=>n.part===part);if(!child)break;selected.push(part);parent=child;}}document.querySelector('#search').value=params.get('q')||'';revealSelected();}
document.addEventListener('click',event=>{const toggle=event.target.closest('[data-toggle]');if(toggle){const k=toggle.dataset.toggle;expanded.has(k)?expanded.delete(k):expanded.add(k);syncTree();[...document.querySelectorAll('[data-toggle]')].find(b=>b.dataset.toggle===k)?.focus({preventScroll:true});return;}const button=event.target.closest('[data-select]');if(button){selected=button.dataset.select?button.dataset.select.split('/'):[];revealSelected();limit=8;updateUrl();render();if(matchMedia('(max-width:760px)').matches){setSidebar(false);document.querySelector('.open-directory').focus();}else{[...document.querySelectorAll('.sidebar [data-select]')].find(b=>b.dataset.select===key(selected))?.focus({preventScroll:true});}}});
document.querySelector('.locate-current').addEventListener('click',()=>{revealSelected();render();const button=[...document.querySelectorAll('.sidebar [data-select]')].find(b=>b.dataset.select===key(selected));button?.focus({preventScroll:true});button?.scrollIntoView({block:'nearest',behavior:'instant'});});
window.addEventListener('popstate',()=>{readUrl();limit=8;render();});
document.querySelector('#search').addEventListener('input',()=>{limit=8;updateUrl(true);render();});document.querySelector('#more').addEventListener('click',()=>{limit+=8;render();});document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.target.matches('input')){event.preventDefault();document.querySelector('#search').focus();}});const layout=document.querySelector('.layout'),sidebar=document.querySelector('.sidebar');
function setSidebar(open){
 const mobile=matchMedia('(max-width:760px)').matches;
 layout.classList.toggle('sidebar-closed',!open);sidebar.hidden=mobile&&!open;sidebar.inert=!open;
 const nav=sidebar.querySelector('nav');nav.inert=!open;nav.setAttribute('aria-hidden',String(!open));
 document.querySelectorAll('.sidebar-toggle').forEach(b=>{b.setAttribute('aria-expanded',String(open));b.setAttribute('aria-label',open?'收起目录':'展开目录');b.title=open?'收起目录':'展开目录';});
 document.querySelector('.open-directory span').textContent=open?'收起目录':'展开目录';
}
document.querySelectorAll('.sidebar-toggle').forEach(button=>button.addEventListener('click',()=>{
 const open=layout.classList.contains('sidebar-closed');setSidebar(open);
 (open?document.querySelector('.close-directory'):document.querySelector('.open-directory')).focus();
}));
matchMedia('(max-width:760px)').addEventListener('change',()=>setSidebar(!layout.classList.contains('sidebar-closed')));
if(location.search)readUrl();else updateUrl(true);setSidebar(!matchMedia('(max-width:760px)').matches);render();

const syncScene=()=>host.dataset.scene=pageDocument.body.dataset.scene;syncScene();new MutationObserver(syncScene).observe(pageDocument.body,{attributes:true,attributeFilter:['data-scene']});
const behavior=()=>matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth';
function focusSearch(){pageDocument.querySelector('#articles').scrollIntoView({behavior:behavior(),block:'start'});root.querySelector('#search').focus({preventScroll:true});}
pageDocument.querySelector('.search-link').addEventListener('click',focusSearch);
window.addEventListener('keydown',event=>{const target=event.composedPath()[0];if(event.key==='/'&&!target.matches('input,textarea,select,[contenteditable]')&&!event.metaKey&&!event.ctrlKey&&!event.altKey){event.preventDefault();focusSearch();}});
root.addEventListener('click',event=>{const link=event.target.closest('a[href="#motto"]');if(link){event.preventDefault();pageDocument.querySelector('.hero').scrollIntoView({behavior:behavior(),block:'start'});history.replaceState({},'',location.pathname+location.search+'#motto');}});
})();
