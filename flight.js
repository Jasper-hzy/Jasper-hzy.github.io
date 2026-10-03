// The path tangent drives both travel and the paper's nose. Turns slow the path itself.
(() => {
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),random=(a,b)=>a+Math.random()*(b-a);
  const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
  const mul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
  const sub=(a,b)=>add(a,mul(b,-1));
  const unit2=p=>{const n=Math.hypot(p.x,p.y)||1;return{x:p.x/n,y:p.y/n,z:0};};
  const pointOn=(curve,t)=>{const u=1-t;return add(add(mul(curve.a,u*u*u),mul(curve.b,3*u*u*t)),add(mul(curve.c,3*u*t*t),mul(curve.d,t*t*t)));};
  const tangentOn=(curve,t)=>{const u=1-t;return mul(add(add(mul(sub(curve.b,curve.a),u*u),mul(sub(curve.c,curve.b),2*u*t)),mul(sub(curve.d,curve.c),t*t)),3);};
  window.createPaperFlight=(element,hero)=>{
    if(!element)return null;
    const ns='http://www.w3.org/2000/svg';element.replaceChildren();element.classList.add('flight-ready');
    const trailGroup=document.createElementNS(ns,'g');trailGroup.setAttribute('aria-hidden','true');trailGroup.setAttribute('class','plane-trail');element.append(trailGroup);
    const trailPaths=Array.from({length:48},()=>{const path=document.createElementNS(ns,'path');path.setAttribute('fill','none');path.setAttribute('stroke-linecap','round');trailGroup.append(path);return path;});
    const faces=Array.from({length:4},()=>{const path=document.createElementNS(ns,'path');path.setAttribute('stroke-linejoin','round');element.append(path);return path;});
    let width=1,height=1,initialized=false,scene='day',time=0,bank=0,pitch=0,still=false,leg=0;
    let orbit=-.65,position={x:.78,y:.21,z:.7},direction={x:.6,y:.8,z:0},segment=null,heading=0,speed=0,tail=null,lastTrailSample=-1;
    const trail=[],trailLifetime=2.4;
    const lighting={dawn:['#fff6e5','#d2dce1','#a0b5c2'],day:['#fffdf6','#d9e6ec','#9aafbd'],dusk:['#ffeadb','#d9bfba','#9e919f'],night:['#c8d9e7','#829db7','#526d89']};
    const screen=p=>({x:p.x*width,y:p.y*height,scale:1.65/(1.65+p.z)});
    const bearing=d=>Math.atan2(d.y*height,d.x*width);
    const guide=angle=>({x:.58+Math.cos(angle)*.27,y:.32+Math.sin(angle)*.17,z:0});
    const guideTangent=angle=>({x:-Math.sin(angle)*.27,y:Math.cos(angle)*.17,z:0});
    function connect(end,exit,duration,mode,controls){
      const distance=Math.max(.025,Math.hypot(end.x-position.x,end.y-position.y));
      const incoming=unit2(direction),outgoing=unit2(exit),handle=distance*.40;
      const b=controls?.b||add(position,mul(incoming,handle)),c=controls?.c||sub(end,mul(outgoing,handle));
      // Depth never changes the screen-space tangent.
      b.z=position.z;c.z=end.z;
      segment={a:{...position},b,c,d:end,duration,mode,t:0,arc:0,table:[{t:0,s:0}],length:0};
      let previous=position;
      for(let i=1;i<=180;i++){
        const p=pointOn(segment,i/180);segment.length+=Math.hypot(p.x-previous.x,(p.y-previous.y)*height/width);
        segment.table.push({t:i/180,s:segment.length});previous=p;
      }
      hero.dataset.flight=mode;leg++;
    }
    function route(mode='cruise'){
      const start=orbit,origin=guide(start),step=random(.58,.78);
      const onGuide=Math.hypot(position.x-origin.x,position.y-origin.y)<.00001;
      let controls;
      orbit+=step;
      if(onGuide){
        // Ellipse derivatives, not independently perturbed handles: adjoining arcs
        // keep their tangent and almost identical curvature through a new leg.
        const handle=4/3*Math.tan(step/4);
        controls={b:add(position,mul(guideTangent(start),handle)),c:sub(guide(orbit),mul(guideTangent(orbit),handle))};
      }else{
        // After a click, find a forward, low-curvature rejoin instead of pulling
        // back toward the waypoint that happened to be next before the click.
        let best=Infinity;
        for(let i=0;i<48;i++){
          const angle=i*Math.PI/24,end=guide(angle),handle=Math.hypot(end.x-position.x,end.y-position.y)*.4;
          if(handle<.015)continue;
          const curve={a:position,b:add(position,mul(unit2(direction),handle)),c:sub(end,mul(unit2(guideTangent(angle)),handle)),d:end};
          let previous=bearing(direction),turn=0,peak=0;
          for(let j=1;j<=48;j++){const next=bearing(tangentOn(curve,j/48)),delta=Math.abs(angleDelta(next,previous));turn+=delta;peak=Math.max(peak,delta);previous=next;}
          const score=turn+peak*8+handle*.4;
          if(score<best){best=score;orbit=angle;controls={b:curve.b,c:curve.c};}
        }
      }
      const end={...guide(orbit),z:leg%2?random(3.8,5.1):random(.08,.40)};
      connect(end,guideTangent(orbit),random(11,15),mode,controls);
    }
    function tAtDistance(curve,distance){
      let low=0,high=curve.table.length-1;
      while(high-low>1){const middle=(low+high)>>1;if(curve.table[middle].s<distance)low=middle;else high=middle;}
      const a=curve.table[low],b=curve.table[high];return a.t+(b.t-a.t)*clamp((distance-a.s)/(b.s-a.s||1),0,1);
    }
    function drawTrail(){
      const color={dawn:'#b6a28e',day:'#8fa9ba',dusk:'#bd9e97',night:'#a7bfd4'}[scene],points=still?[]:[...trail,{point:tail,born:time}];
      for(let i=0;i<trailPaths.length;i++){
        const path=trailPaths[i],entry=points[i],next=points[i+1];if(!entry||!next){path.setAttribute('d','');continue;}
        const a=screen(entry.point),b=screen(next.point),previous=i?screen(points[i-1].point):a,life=clamp(1-(time-entry.born)/trailLifetime,0,1);
        path.setAttribute('d',`M${((previous.x+a.x)/2).toFixed(2)} ${((previous.y+a.y)/2).toFixed(2)}Q${a.x.toFixed(2)} ${a.y.toFixed(2)} ${((a.x+b.x)/2).toFixed(2)} ${((a.y+b.y)/2).toFixed(2)}`);
        path.setAttribute('stroke',color);path.setAttribute('stroke-opacity',(.32*life*life).toFixed(3));path.setAttribute('stroke-width',Math.max(.25,(.65+life*1.4)*a.scale).toFixed(2));
      }
    }
    function draw(){
      const center=screen(position),roll=.48+bank,modelScale=(width<760?68:106)/90;
      // Stable camera-space paper frame: world-up cannot flip the wings on a climb.
      function vertex([x,y,z]){
        const across=y*Math.cos(roll)-z*Math.sin(roll),up=y*Math.sin(roll)+z*Math.cos(roll);
        const along=x*Math.cos(pitch)+up*Math.sin(pitch),depth=-x*Math.sin(pitch)+up*Math.cos(pitch);
        const scale=1.65/(1.65+position.z+depth*.003)*modelScale;
        return{x:center.x+(along*Math.cos(heading)-across*Math.sin(heading))*scale,y:center.y+(along*Math.sin(heading)+across*Math.cos(heading))*scale,depth};
      }
      const trailing=vertex([-35,0,-8]);tail={x:trailing.x/width,y:trailing.y/height,z:position.z};
      if(!still&&time-lastTrailSample>=.055){trail.push({point:tail,born:time});lastTrailSample=time;}
      while(trail.length&&(time-trail[0].born>trailLifetime||trail.length>47))trail.shift();drawTrail();
      const vertices=[[52,0,0],[-38,-30,5],[-20,-5,5],[-32,0,-16],[-20,5,5],[-38,30,5]].map(vertex);
      const polygons=[[0,1,2],[0,4,5],[0,2,3],[0,3,4]].map((indices,index)=>({indices,index,depth:indices.reduce((sum,i)=>sum+vertices[i].depth,0)/3})).sort((a,b)=>b.depth-a.depth);
      const colors=lighting[scene];
      for(const [order,face]of polygons.entries()){
        const path=faces[order];path.setAttribute('d',face.indices.map((index,i)=>`${i?'L':'M'}${vertices[index].x.toFixed(2)} ${vertices[index].y.toFixed(2)}`).join('')+'Z');
        path.setAttribute('fill',colors[[0,0,2,1][face.index]]);path.setAttribute('stroke',scene==='night'?'#718ca5':'#526975');path.setAttribute('stroke-width',Math.max(.45,center.scale*1.05));
      }
      element.style.opacity=String(clamp(.98-position.z*.085,.52,.98));element.style.zIndex='2';
      Object.assign(element.dataset,{x:center.x.toFixed(2),y:center.y.toFixed(2),depth:position.z.toFixed(3),scale:center.scale.toFixed(3),bank:bank.toFixed(3),pitch:pitch.toFixed(3),bearing:heading.toFixed(4),speed:speed.toFixed(4),leg:String(leg),phase:segment&&segment.arc/segment.length>.68?'coast':'glide',trail:String(still?0:trail.length)});
      return{x:center.x,y:center.y,depth:position.z,scale:center.scale,angle:heading,bank,mode:hero.dataset.flight};
    }
    return{
      resize(w,h){width=w;height=h;element.setAttribute('viewBox',`0 0 ${w} ${h}`);if(!initialized){position={x:.58+Math.cos(orbit)*.27,y:.32+Math.sin(orbit)*.17,z:.7};direction={x:-Math.sin(orbit)*.27,y:Math.cos(orbit)*.17,z:0};initialized=true;route();}heading=bearing(direction);draw();},
      changeScene(name,reduced){scene=name;still=reduced;draw();},
      moveTo(x,y,reduced){
        const target={x:clamp(x,20,width-20)/width,y:clamp(y,20,height-20)/height,z:.22};
        if(reduced){position=target;segment=null;still=true;trail.length=0;hero.dataset.flight='rest';draw();return;}
        const delta=sub(target,position),distance=Math.hypot(delta.x*width,delta.y*height),incoming=unit2(direction);let exit=unit2(delta);
        if(distance<6){position={...position,x:target.x,y:target.y};segment=null;hero.dataset.arrived=`${(target.x*width).toFixed(2)},${(target.y*height).toFixed(2)}`;draw();return;}
        // A U-turn needs lateral room, not collinear handles that form a cusp.
        if(incoming.x*exit.x+incoming.y*exit.y<-.5){const angle=.75;exit={x:exit.x*Math.cos(angle)-exit.y*Math.sin(angle),y:exit.x*Math.sin(angle)+exit.y*Math.cos(angle),z:0};}
        connect(target,exit,clamp(distance/210,1.7,4.2),'target');
      },
      tick(dt,reduced){
        still=reduced;if(reduced){trail.length=0;return draw();}if(dt<=0)return draw();if(!segment)route();time+=dt;
        const curve=segment,fraction=curve.arc/curve.length;
        const pace=curve.mode==='target'?1:(.40+1.30*Math.sin(Math.PI*fraction)**2)*1.2127;
        const desiredSpeed=curve.length/curve.duration*pace;
        const travelSpeed=curve.mode==='target'?desiredSpeed:speed+(desiredSpeed-speed)*(1-Math.exp(-dt*2));
        let advance=Math.min(curve.length-curve.arc,travelSpeed*dt);
        const maxTurn=(curve.mode==='target'?1.35:.18)*dt;
        const turnAt=distance=>Math.abs(angleDelta(bearing(tangentOn(curve,tAtDistance(curve,curve.arc+distance))),heading));
        // Solve the speed cap continuously; repeated multiplication made speed
        // oscillate at tight bends. Nose and displacement still share one tangent.
        if(turnAt(advance)>maxTurn){
          let low=0,high=advance;
          for(let i=0;i<20;i++){const middle=(low+high)/2;if(turnAt(middle)>maxTurn)high=middle;else low=middle;}
          advance=low;
        }
        curve.arc=Math.min(curve.length,curve.arc+advance);curve.t=tAtDistance(curve,curve.arc);
        const previousHeading=heading,previousDepth=position.z;position=pointOn(curve,curve.t);direction=tangentOn(curve,curve.t);heading=bearing(direction);
        speed=dt>0?advance/dt:0;
        if(dt>0){const turnRate=angleDelta(heading,previousHeading)/dt,limit=curve.mode==='target'?.12:.065;bank+=(clamp(-turnRate*.18,-limit,limit)-bank)*(1-Math.exp(-dt*1.8));pitch+=(clamp((position.z-previousDepth)/dt*.16,-.14,.14)-pitch)*(1-Math.exp(-dt*1.3));}
        if(curve.length-curve.arc<.000001){position={...curve.d};direction=tangentOn(curve,1);if(curve.mode==='target'){const arrived=screen(position);hero.dataset.arrived=`${arrived.x.toFixed(2)},${arrived.y.toFixed(2)}`;}route(curve.mode==='target'?'return':'cruise');}
        return draw();
      }
    };
  };
})();
