import {isKakaoBrowser,isAppleMobile} from './browser-handoff.js?v=1.2.3';
const IMAGE_TYPES={'image/png':'.png','image/jpeg':'.jpg'};

export function imageDataURL(blob,Reader=globalThis.FileReader){
 return new Promise((resolve,reject)=>{
  if(!IMAGE_TYPES[blob?.type])return reject(new Error('image-type'));
  const reader=new Reader();
  reader.onerror=()=>reject(new Error('image-read'));
  reader.onload=()=>{
   const data=reader.result;
   if(typeof data==='string'&&data.startsWith(`data:${blob.type};base64,`))resolve(data);
   else reject(new Error('image-data'));
  };
  reader.readAsDataURL(blob);
 });
}

export function isEmbeddedBrowser(nav=globalThis.navigator){
 return /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|DaumApps|Line\/|; wv\)/i.test(nav?.userAgent||'');
}

export function canSaveWithDevice(file,nav=globalThis.navigator){
 try{return typeof nav?.share==='function'&&!!nav.canShare?.({files:[file]});}catch{return false;}
}

export async function saveImageFile(file,dataURL,environment={}){
 const win=environment.window??globalThis.window,nav=environment.navigator??globalThis.navigator,doc=environment.document??globalThis.document;
 const extension=IMAGE_TYPES[file?.type];
 if(!extension||!file.name.endsWith(extension)||!dataURL?.startsWith(`data:${file.type};base64,`))return {status:'failed'};
 // Call the picker in the original click turn. Write bytes, never an image URL.
 if(typeof win?.showSaveFilePicker==='function'){
  try{
   const handle=await win.showSaveFilePicker({suggestedName:file.name,types:[{description:extension==='.png'?'PNG 이미지':'JPG 이미지',accept:{[file.type]:[extension]}}],excludeAcceptAllOption:true});
   const stream=await handle.createWritable();
   try{await stream.write(file);await stream.close();}
   catch(error){try{await stream.abort();}catch{}throw error;}
   return {status:'saved'};
  }catch(error){return {status:error?.name==='AbortError'?'cancelled':'failed'};}
 }
 // In-app download handlers often cannot resolve temporary browser URLs.
 // Show the actual image instead; offer an explicit device save action there.
 // Kakao documents data URL downloads on iOS only. Android needs a real
 // HTTP attachment or an external browser for our client-generated card.
 if(isEmbeddedBrowser(nav)&&!(isKakaoBrowser(nav)&&isAppleMobile(nav)))return {status:'image-view'};
 try{
  const anchor=doc.createElement('a');
  if(!('download' in anchor))return {status:'image-view'};
  anchor.href=dataURL;anchor.download=file.name;anchor.type=file.type;anchor.hidden=true;
  doc.body.appendChild(anchor);
  try{anchor.click();}finally{anchor.remove();}
  // The browser does not report whether it accepted the download request.
  return {status:'requested'};
 }catch{return {status:'failed'};}
}

export async function saveWithDevice(file,nav=globalThis.navigator){
 if(!canSaveWithDevice(file,nav))return {status:'unsupported'};
 try{await nav.share({files:[file]});return {status:'opened'};}
 catch(error){return {status:error?.name==='AbortError'?'cancelled':'failed'};}
}
