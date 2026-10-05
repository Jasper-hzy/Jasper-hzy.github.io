(() => {
  async function copyText(text){
    if(navigator.clipboard&&window.isSecureContext){try{await navigator.clipboard.writeText(text);return;}catch{}}
    const input=document.createElement('textarea');input.value=text;input.setAttribute('readonly','');input.style.cssText='position:fixed;opacity:0;';document.body.append(input);input.select();const copied=document.execCommand('copy');input.remove();if(!copied)throw new Error('Copy unavailable');
  }
  for(const block of document.querySelectorAll('.code-block')){
    const label=block.querySelector('.code-label'),code=block.querySelector('code');if(!label||!code)continue;
    const button=document.createElement('button');button.type='button';button.className='copy-code';button.textContent='复制';button.setAttribute('aria-label','复制代码');button.setAttribute('aria-live','polite');label.append(button);
    button.addEventListener('click',async()=>{try{await copyText(code.textContent);button.textContent='已复制';}catch{button.textContent='复制失败';}setTimeout(()=>{button.textContent='复制';},1800);});
  }
  const headings=[...document.querySelectorAll('.prose h2,.prose h3')],links=[...document.querySelectorAll('.desktop-toc nav a,.mobile-toc nav a')];
  let pending=false;
  function update(){pending=false;const distance=document.documentElement.scrollHeight-innerHeight;document.documentElement.style.setProperty('--progress',distance>0?String(Math.min(1,Math.max(0,scrollY/distance))):'0');
    let current=headings[0]?.id;for(const heading of headings){if(heading.getBoundingClientRect().top<=145)current=heading.id;else break;}
    for(const link of links){let target;try{target=decodeURIComponent(link.hash.slice(1));}catch{target='';}if(target===current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);update();
})();
