import {normalizeName,shortDescription} from './personalization.js?v=1.2.1';
function rounded(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function fitText(ctx,text,maxWidth,size,family){ctx.font=`${size}px ${family}`;while(ctx.measureText(text).width>maxWidth&&size>18){size--;ctx.font=`${size}px ${family}`;}return size;}
function wrapText(ctx,text,x,y,maxWidth,lineHeight){let line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){ctx.fillText(line,x,y);line=word;y+=lineHeight;}else line=next;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}
async function drawResultCard(c,name,environment={}){
 const doc=environment.document??document,ImageClass=environment.Image??Image;
 const person=normalizeName(name)||'친구';
 environment.onProgress?.(0);
 if(doc.fonts?.load)await Promise.all([doc.fonts.load('44px Jua',person+c.name),doc.fonts.load('30px LittleDay',shortDescription(c))]);
 if(doc.fonts?.ready)await doc.fonts.ready;
 const canvas=doc.createElement('canvas');canvas.width=1080;canvas.height=1440;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas');
 ctx.fillStyle='#faf6ef';ctx.fillRect(0,0,1080,1440);ctx.lineWidth=3;
 rounded(ctx,54,54,972,1332,45,'#fffdf8','#e1d3ca');
 ctx.textAlign='center';ctx.fillStyle='#927f82';ctx.font='24px LittleDay, sans-serif';ctx.fillText('작은 하루 · 먼작귀 속의 나',540,109);
 ctx.fillStyle='#806573';fitText(ctx,`'${person}'님은`,880,43,'Jua, sans-serif');ctx.fillText(`'${person}'님은`,540,184);
 ctx.fillStyle='#493e43';fitText(ctx,c.name,880,72,'Jua, sans-serif');ctx.fillText(c.name,540,268);
 ctx.fillStyle='#806573';ctx.font='39px Jua, sans-serif';ctx.fillText('성격이에요!',540,324);
 ctx.fillStyle=c.color;ctx.beginPath();ctx.ellipse(540,582,248,224,-.12,0,Math.PI*2);ctx.fill();
 environment.onProgress?.(1);
 const image=await new Promise((resolve,reject)=>{const im=new ImageClass();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('image'));im.src=c.image;});
 ctx.drawImage(image,293,334,494,494);
 environment.onProgress?.(2);
 ctx.fillStyle='#806c76';fitText(ctx,c.type,862,32,'LittleDay, sans-serif');ctx.fillText(c.type,540,867);
 ctx.font='26px LittleDay, sans-serif';ctx.fillText(c.tags.map(t=>'#'+t).join('    '),540,923);
 ctx.strokeStyle='#ddcec5';ctx.setLineDash([8,9]);ctx.beginPath();ctx.moveTo(85,963);ctx.lineTo(995,963);ctx.stroke();ctx.setLineDash([]);
 ctx.textAlign='left';ctx.fillStyle='#66565e';ctx.font='30px LittleDay, sans-serif';
 wrapText(ctx,shortDescription(c),133,1020,814,46);
 ctx.textAlign='center';ctx.fillStyle='#a78a8f';
 fitText(ctx,`“${c.quote}”`,814,31,'Jua, sans-serif');ctx.fillText(`“${c.quote}”`,540,1262);
 ctx.fillStyle='#a18c8d';ctx.font='18px LittleDay, sans-serif';ctx.fillText('20가지 친구 · 팬 메이드 성격 놀이 · © nagano',540,1354);
 return canvas;
}
function encodeCard(canvas,type){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?.type===type?resolve(blob):reject(new Error('image-export')),type,.94));}
export async function createResultCard(c,name,environment={}){
 return encodeCard(await drawResultCard(c,name,environment),'image/png');
}
export async function createResultCardFiles(c,name,environment={}){
 const canvas=await drawResultCard(c,name,environment);
 environment.onProgress?.(3);
 const [png,jpg]=await Promise.all([encodeCard(canvas,'image/png'),encodeCard(canvas,'image/jpeg')]);
 return {png,jpg};
}
