// Render the painting and its moving water together: no bright overlay seam at the horizon.
(() => {
  const rgb=hex=>[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255);
  function createGL(canvas){
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false});if(!gl)return null;
    const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision?'highp':'mediump';
    const vertex='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
    const fragment=`precision ${precision} float;
      uniform sampler2D previousImage,currentImage;
      uniform vec2 viewport;uniform vec4 bounds,crop;uniform vec3 previousSky,currentSky;uniform float time,blend,wind;
      float boat(vec2 uv,vec2 center,vec2 radius){vec2 p=(uv-center)/radius;return smoothstep(.8,1.45,dot(p,p));}
      void main(){
        vec2 point=vec2(gl_FragCoord.x,viewport.y-gl_FragCoord.y),local=(point-bounds.xy)/bounds.zw;
        vec3 sky=mix(previousSky,currentSky,blend);
        if(local.x<0.||local.x>1.||local.y<0.||local.y>1.){gl_FragColor=vec4(sky,1.);return;}
        vec2 uv=crop.xy+local*crop.zw;
        float depth=clamp((uv.y-.49)/.46,0.,1.);
        float coast=mix(.86,.63,smoothstep(.50,.94,uv.y));
        float water=smoothstep(.515,.58,uv.y)*(1.-smoothstep(.90,.97,uv.y))*(1.-smoothstep(coast-.035,coast+.025,uv.x));
        water*=boat(uv,vec2(.064,.535),vec2(.018,.065))*boat(uv,vec2(.479,.545),vec2(.022,.063));
        // Perspective compresses distant waves. Three oblique swells travel shoreward at different speeds.
        float distance=1./(.20+depth),worldX=(uv.x-.45)*distance*3.;
        float a=distance*8.6+worldX*.65+time*.90;
        float b=distance*15.3-worldX*2.4+time*1.18;
        float c=distance*30.1+worldX*5.2+time*1.64;
        float swell=sin(a)*.72+sin(b)*.22+sin(c)*.06;
        vec2 drift=vec2(cos(a)*.0038+cos(b)*.0014,swell*.0135)*depth*water*wind;
        vec2 moved=clamp(uv+drift,vec2(.001),vec2(.999));
        vec3 color=mix(texture2D(previousImage,moved).rgb,texture2D(currentImage,moved).rgb,blend);
        // Work with the painted whitecaps. No additive light, synthetic glow, or full-width foam bars.
        float slope=cos(a)*.72+cos(b)*.22+cos(c)*.06;
        color*=1.+slope*.028*depth*water*wind;
        float edge=smoothstep(0.,.32,local.y)*(1.-smoothstep(.91,1.,local.y));
        gl_FragColor=vec4(mix(sky,clamp(color,0.,1.),edge),1.);
      }`;
    function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;}
    const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Ocean shader link failed');gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const uniforms=Object.fromEntries(['previousImage','currentImage','previousSky','currentSky','viewport','bounds','crop','time','blend','wind'].map(key=>[key,gl.getUniformLocation(program,key)]));
    let previous,current,previousSky=rgb('#f7f6f2'),currentSky=previousSky,progress=1,lost=false;
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.closest('.hero')?.classList.remove('ocean-ready');canvas.style.opacity='0';});
    canvas.addEventListener('webglcontextrestored',()=>{canvas.dataset.renderer='static';});
    function texture(image){const value=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,value);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);return value;}
    return{
      setImage(image,instant,background='#f7f6f2'){if(lost)return;if(previous&&previous!==current)gl.deleteTexture(previous);previous=current;current=texture(image);previousSky=currentSky;currentSky=rgb(background);if(!previous){previous=current;previousSky=currentSky;}progress=instant?1:0;},
      render({ratio,bounds,crop,time,dt,wind=1,still}){
        if(!current||lost)return;progress=still?1:Math.min(1,progress+dt/1.4);
        const blend=progress*progress*(3-2*progress);
        gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(uniforms.viewport,canvas.width,canvas.height);gl.uniform4f(uniforms.bounds,bounds.x*ratio,bounds.y*ratio,bounds.width*ratio,bounds.height*ratio);gl.uniform4fv(uniforms.crop,crop);
        gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.blend,blend);gl.uniform1f(uniforms.wind,still?0:wind);
        gl.uniform3fv(uniforms.previousSky,previousSky);gl.uniform3fv(uniforms.currentSky,currentSky);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,previous);gl.uniform1i(uniforms.previousImage,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,current);gl.uniform1i(uniforms.currentImage,1);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      }
    };
  }
  function create2D(canvas){
    const context=canvas.getContext('2d');if(!context)return null;
    const layer=document.createElement('canvas'),paint=layer.getContext('2d');let current,previous,progress=1,previousSky=rgb('#f7f6f2'),currentSky=previousSky;
    function imagePass(image,opacity,options){
      if(!image||opacity<=0)return;
      const {bounds:{x,y,width,height},crop,time,wind=1,still}=options;
      const sx=image.naturalWidth*crop[0],sy=image.naturalHeight*crop[1],sw=image.naturalWidth*crop[2],sh=image.naturalHeight*crop[3];
      paint.clearRect(0,0,layer.width,layer.height);paint.globalAlpha=1;paint.drawImage(image,sx,sy,sw,sh,x,y,width,height);
      if(!still){
        const top=y+(.58-crop[1])/crop[3]*height,bottom=y+(.91-crop[1])/crop[3]*height;
        paint.save();paint.beginPath();paint.moveTo(x,top);paint.lineTo(x+width*Math.min(1,(.77-crop[0])/crop[2]),top);paint.lineTo(x+width*Math.min(1,(.60-crop[0])/crop[2]),bottom);paint.lineTo(x,bottom);paint.closePath();paint.clip();
        for(let row=0;row<100;row++){
          const depth=row/100,world=1/(.2+depth),wave=Math.sin(world*8.6+time*.9)*.72+Math.sin(world*15.3+time*1.18)*.22;
          const v=top+(bottom-top)*depth,rowHeight=(bottom-top)/100+1,fade=Math.min(1,row/14)*Math.min(1,(100-row)/16);
          const drift=wave*height*.009*depth*fade*wind;
          paint.globalAlpha=fade;paint.drawImage(image,sx,sy+sh*(v-y+drift)/height,sw,sh*rowHeight/height,x,v,width,rowHeight);
        }paint.restore();
      }
      paint.globalAlpha=1;paint.globalCompositeOperation='destination-in';const fade=paint.createLinearGradient(0,y,0,y+height);fade.addColorStop(0,'transparent');fade.addColorStop(.32,'#000');fade.addColorStop(.91,'#000');fade.addColorStop(1,'transparent');paint.fillStyle=fade;paint.fillRect(x,y,width,height);paint.globalCompositeOperation='source-over';
      context.globalAlpha=opacity;context.drawImage(layer,0,0,layer.width,layer.height,0,0,canvas.width/options.ratio,canvas.height/options.ratio);
    }
    return{
      setImage(image,instant,background='#f7f6f2'){previous=current||image;previousSky=current?currentSky:rgb(background);currentSky=rgb(background);current=image;progress=instant?1:0;},
      render(options){
        if(!current)return;const {ratio,dt,still}=options;progress=still?1:Math.min(1,progress+dt/1.4);
        if(layer.width!==Math.round(canvas.width/ratio)||layer.height!==Math.round(canvas.height/ratio)){layer.width=Math.round(canvas.width/ratio);layer.height=Math.round(canvas.height/ratio);}
        context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,canvas.width/ratio,canvas.height/ratio);
        const mix=progress*progress*(3-2*progress);context.globalAlpha=1;context.fillStyle=`rgb(${currentSky.map((value,i)=>Math.round((previousSky[i]*(1-mix)+value*mix)*255)).join(',')})`;context.fillRect(0,0,canvas.width/ratio,canvas.height/ratio);
        imagePass(previous,1,options);imagePass(current,mix,options);context.globalAlpha=1;
      }
    };
  }
  window.createOceanRenderer=canvas=>{
    try{const renderer=createGL(canvas);if(renderer){canvas.dataset.renderer='webgl';return renderer;}}catch{canvas.dataset.renderer='static';return null;}
    const renderer=create2D(canvas);canvas.dataset.renderer=renderer?'canvas':'static';return renderer;
  };
})();
