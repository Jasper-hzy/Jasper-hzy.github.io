// A seated, still illustration. Only the expression and attached scarf change.
window.createSnoopyActor=function(container){
  const canvas=container?.querySelector('.snoopy-actor'),sheet=container?.querySelector('.snoopy-poses');
  const context=canvas?.getContext('2d');if(!context||!sheet)return null;
  const width=1000,height=1286/1223*width,margin=300,scale=1.075;
  let ready=false,time=0,scene='day',expression='open',expressionUntil=0,nextBlink=2.4,reduced=false,wind=1;
  let box={x:0,y:0,scale:1},nearPlane=false;
  function draw(){
    if(!ready)return;
    context.clearRect(0,0,width+margin,height);context.save();context.translate(510+margin,506);context.scale(scale,scale);
    // The knot stays at the collar; the larger ribbon bends smoothly along its length.
    const wave=reduced?0:Math.sin(time*1.6)*19+Math.sin(time*2.7+.8)*8;
    const tip=reduced?-17:-17+Math.sin(time*1.6-1.1)*27+Math.sin(time*2.2)*9;
    const reach=263+(reduced?0:Math.sin(time*.8)*8),strength=.65+wind*.45;
    context.beginPath();context.moveTo(17,-187);
    context.bezierCurveTo(80,-157+wave*.45*strength,146,-223+wave*strength,reach,-185+tip*strength);
    context.lineTo(reach-17,-173+tip*strength);context.lineTo(reach-1,-165+tip*strength);
    context.bezierCurveTo(156,-195+wave*strength,91,-133+wave*.4*strength,16,-172);context.closePath();
    const color=context.createLinearGradient(15,-215,reach,-146);color.addColorStop(0,'#d96951');color.addColorStop(.48,'#e88e73');color.addColorStop(1,'#d97861');
    context.fillStyle=color;context.fill();context.strokeStyle='#30312b';context.lineWidth=2.6;context.lineJoin='round';context.stroke();
    context.beginPath();context.moveTo(28,-177);context.bezierCurveTo(92,-148+wave*.42*strength,155,-205+wave*strength,reach-21,-176+tip*strength);context.strokeStyle='#af5747';context.lineWidth=1.2;context.stroke();
    // Retain the approved body, feet and head artwork exactly in one seated position.
    context.drawImage(sheet,80,298,342,166,-168,-166,342,166);
    context.drawImage(sheet,80,40,342,258,-168,-424,342,258);
    if(expression!=='open'){
      // Replace only the eye area, so blinking cannot shift the head or change its silhouette.
      context.save();context.beginPath();context.ellipse(-13,-332,25,34,0,0,Math.PI*2);context.clip();
      context.drawImage(sheet,512+209,97,56,70,-39,-367,56,70);context.restore();
    }
    context.restore();Object.assign(container.dataset,{action:'seated',expression,pose:'seated',onRoof:'true',scarf:reduced?'still':'wind'});
  }
  function resize(){
    const pixels=Math.max(1,Math.round(container.clientWidth*Math.min(devicePixelRatio||1,2))),w=Math.round(pixels*1.3),h=Math.round(pixels*height/width);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;context.setTransform(w/(width+margin),0,0,h/height,0,0);}
    box={x:container.offsetLeft,y:container.offsetTop,scale:container.clientWidth/width};draw();
  }
  sheet.decode().then(()=>{ready=true;resize();container.classList.add('actor-ready');draw();}).catch(()=>{container.dataset.action='fallback';});
  return{
    resize,
    companionPoint(){return{x:box.x+510*box.scale,y:box.y+130*box.scale};},
    changeScene(name,still,initial=false){scene=name;if(!still&&!initial){expression='content';expressionUntil=time+(scene==='night'?1.5:.7);}draw();},
    tick(dt,still,environment={}){
      reduced=still;wind=environment.wind??1;
      if(still){expression='open';draw();return;}
      time+=dt;
      const plane=environment.plane,headX=box.x+510*box.scale,headY=box.y+130*box.scale;
      const close=!!plane&&plane.depth<1.1&&Math.hypot(plane.x-headX,plane.y-headY)<container.clientWidth*.5;
      if(close&&!nearPlane&&time>expressionUntil+1){expression='content';expressionUntil=time+.65;}nearPlane=close;
      if(time>=nextBlink){expression='blink';expressionUntil=time+.15;nextBlink=time+4.2+Math.random()*3.8;}
      if(time>=expressionUntil)expression='open';draw();
    }
  };
};
