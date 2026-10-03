(() => {
  const hero=document.querySelector('.hero'),canvas=document.querySelector('#daydream');if(!hero||!canvas)return;
  const sea=hero.querySelector('[data-landscape="day"]'),landscapes=[...hero.querySelectorAll('[data-landscape]')];
  const dog=hero.querySelector('.snoopy-scene'),clouds=[...hero.querySelectorAll('.cloud')];
  const toggle=document.querySelector('#scene-cycle'),root=document.body,motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
  const scenes=['dawn','day','dusk','night'],labels={dawn:'日出',day:'白昼',dusk:'黄昏',night:'夜晚'};
  const renderer=window.createOceanRenderer?.(canvas),clamp=(number,min,max)=>Math.min(max,Math.max(min,number));
  const flight=window.createPaperFlight?.(hero.querySelector('.paper-plane'),hero);
  const character=window.createSnoopyActor?.(dog);
  const backgrounds={dawn:'#faf3e9',day:'#f7f6f2',dusk:'#f7ece3',night:'#141f32'};
  let ratio=1,frame=0,visible=true,reduced=motionQuery.matches,last=0,elapsed=0,request=0,active='day',ready=false;
  let sceneAge=0,pendingScene=null,wind=1,waveTime=0;
  let pointer={x:0,y:0},view={x:0,y:0},scroll=0,geometry={x:0,y:0,width:1,height:1},crop=[0,0,1,1];
  async function selectScene(name,persist=false){
    const image=landscapes.find(value=>value.dataset.landscape===name);if(!image)return;const token=++request;pendingScene=name;
    try{if(!image.hasAttribute('src'))image.src=image.dataset.src;await image.decode();}
    catch{if(token===request){document.querySelector('.scene-switch').dataset.load='failed';pendingScene=null;sceneAge=0;}return;}
    if(token!==request)return;
    character?.changeScene(name,reduced,!ready);flight?.changeScene(name,reduced);
    root.dataset.scene=name;active=name;pendingScene=null;sceneAge=0;document.querySelector('.scene-switch').dataset.load='ready';
    const next=scenes[(scenes.indexOf(name)+1)%scenes.length];toggle.setAttribute('aria-label',`当前${labels[name]}，切换至${labels[next]}`);toggle.title=`${labels[name]} → ${labels[next]}`;
    document.querySelector('meta[name="theme-color"]').content=backgrounds[name];document.documentElement.style.colorScheme=name==='night'?'dark':'light';
    renderer?.setImage(image,reduced||!ready,backgrounds[name]);if(renderer)hero.classList.add('ocean-ready');ready=true;paint(0);refresh();
    if(persist)try{localStorage.setItem('blog-seaside-scene',name);}catch{}
  }
  function resize(){
    const bounds=hero.getBoundingClientRect();ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(bounds.width*ratio);canvas.height=Math.round(bounds.height*ratio);
    geometry={x:sea.offsetLeft,y:sea.offsetTop,width:sea.offsetWidth,height:sea.offsetHeight};
    flight?.resize(bounds.width,bounds.height);
    character?.resize();
    hero.style.setProperty('--sun-x',`${geometry.x+geometry.width*.26}px`);hero.style.setProperty('--sun-y',`${geometry.y+geometry.height*.445-(matchMedia('(max-width:760px)').matches?40:65)}px`);
    const scale=Math.max(geometry.width/2172,geometry.height/724),imageWidth=2172*scale,imageHeight=724*scale;
    const alignment=matchMedia('(max-width:760px)').matches?.62:.5;
    crop=[(imageWidth-geometry.width)*alignment/imageWidth,(imageHeight-geometry.height)/imageHeight,geometry.width/imageWidth,geometry.height/imageHeight];paint(0);
  }
  function paint(dt,wallDelta=dt){
    const plane=flight?.tick(dt,reduced);
    character?.tick(dt,reduced,{plane,wind});
    wind+=(({dawn:.7,day:1,dusk:.85,night:.5}[active])-wind)*(1-Math.exp(-dt*.8));waveTime+=dt*wind;
    if(ready&&!reduced&&!pendingScene&&!toggle.matches(':hover,:focus-visible')){sceneAge+=wallDelta;if(sceneAge>=8)selectScene(scenes[(scenes.indexOf(active)+1)%scenes.length]);}
    toggle.style.setProperty('--cycle-progress',reduced?0:Math.min(1,sceneAge/8));
    const ease=reduced?1:1-Math.exp(-dt*4);view.x+=(pointer.x-view.x)*ease;view.y+=(pointer.y-view.y)*ease;
    const px=reduced?0:view.x,py=reduced?0:view.y,landX=px*-6,landY=py*-3+scroll*8;
    for(const image of landscapes){image.style.setProperty('--land-x',`${landX}px`);image.style.setProperty('--land-y',`${landY}px`);}
    for(const [index,cloud]of clouds.entries()){
      const drift=reduced?0:Math.sin(elapsed*.11+index)*10;cloud.style.setProperty('--cloud-x',`${px*(11+index*2)+drift}px`);cloud.style.setProperty('--cloud-y',`${py*4}px`);
    }
    renderer?.render({ratio,bounds:{...geometry,x:geometry.x+landX,y:geometry.y+landY},crop,time:reduced?0:waveTime,dt:wallDelta,wind,night:active==='night',scene:active,still:reduced||!visible||document.hidden});
  }
  function tick(now){
    frame=0;if(reduced||!visible||document.hidden)return;
    if(now-last>=1000/30){const wallDelta=(now-last)/1000,dt=Math.min(wallDelta,.05);last=now;elapsed+=wallDelta;paint(dt,wallDelta);}frame=requestAnimationFrame(tick);
  }
  function refresh(){
    if(frame)cancelAnimationFrame(frame);frame=0;
    if(reduced){view={x:0,y:0};paint(0);}else if(visible&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}
    hero.dataset.motion=reduced?'reduced':visible&&!document.hidden?'running':'paused';
  }
  toggle.addEventListener('click',()=>selectScene(scenes[(scenes.indexOf(pendingScene||active)+1)%scenes.length],true));
  hero.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse')return;const bounds=hero.getBoundingClientRect();pointer={x:clamp((event.clientX-bounds.left)/bounds.width*2-1,-1,1),y:clamp((event.clientY-bounds.top)/bounds.height*2-1,-1,1)};});
  hero.addEventListener('pointerleave',()=>{pointer={x:0,y:0};});
  hero.addEventListener('click',event=>{if(event.target.closest('a,button,input,.hero-copy'))return;const bounds=hero.getBoundingClientRect();flight?.moveTo(event.clientX-bounds.left,event.clientY-bounds.top,reduced);if(reduced)paint(0);});
  window.addEventListener('scroll',()=>{scroll=clamp(-hero.getBoundingClientRect().top/hero.offsetHeight,0,1);hero.style.setProperty('--scene-scroll',scroll);},{passive:true});
  document.addEventListener('visibilitychange',refresh);motionQuery.addEventListener('change',()=>{reduced=motionQuery.matches;refresh();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].intersectionRatio>.08;refresh();},{threshold:[0,.08]}).observe(hero);
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(hero);else window.addEventListener('resize',resize);
  resize();refresh();
  const hour=new Date().getHours();let initial=hour>=5&&hour<8?'dawn':hour>=8&&hour<17?'day':hour>=17&&hour<20?'dusk':'night';
  try{const saved=localStorage.getItem('blog-seaside-scene');if(saved in backgrounds)initial=saved;}catch{}
  selectScene(initial);
})();
