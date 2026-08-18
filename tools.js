(()=>{
  const $=s=>document.querySelector(s);
  const downloadBlob=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800)};
  const files=()=>[...($('#convert-files')?.files||[])];

  $('#pdf-to-images')?.addEventListener('click',async()=>{
    const file=files().find(f=>f.type==='application/pdf'||/\.pdf$/i.test(f.name));
    if(!file){alert('Please select a PDF first.');return}
    const out=$('#convert-output');out.innerHTML='<p>Converting PDF…</p>';
    try{
      const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
      const data=new Uint8Array(await file.arrayBuffer());const pdf=await pdfjs.getDocument({data}).promise;out.innerHTML='';
      for(let i=1;i<=pdf.numPages;i++){
        const page=await pdf.getPage(i),viewport=page.getViewport({scale:2}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
        await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        const card=document.createElement('div');card.className='convert-item';const img=new Image();img.src=canvas.toDataURL('image/png');img.alt=`PDF page ${i}`;
        const b=document.createElement('button');b.type='button';b.textContent=`DOWNLOAD PAGE ${i}`;b.onclick=()=>canvas.toBlob(blob=>downloadBlob(blob,`${file.name.replace(/\.pdf$/i,'')}-page-${i}.png`),'image/png');card.append(img,b);out.append(card);
      }
    }catch(err){console.error(err);out.textContent='Conversion failed. '+err.message}
  });

  $('#images-to-pdf')?.addEventListener('click',async()=>{
    const imgs=files().filter(f=>f.type.startsWith('image/'));if(!imgs.length){alert('Please select one or more images first.');return}
    try{
      const {jsPDF}=window.jspdf;let pdf=null;
      for(let i=0;i<imgs.length;i++){
        const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(imgs[i])});
        const image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=data});
        const orientation=image.width>image.height?'landscape':'portrait';
        if(!pdf)pdf=new jsPDF({orientation,unit:'mm',format:'a4'});else pdf.addPage('a4',orientation);
        const pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),margin=8,ratio=Math.min((pw-margin*2)/image.width,(ph-margin*2)/image.height),w=image.width*ratio,h=image.height*ratio;
        pdf.addImage(data,imgs[i].type.includes('png')?'PNG':'JPEG',(pw-w)/2,(ph-h)/2,w,h,undefined,'FAST');
      }
      pdf.save('images.pdf');
    }catch(err){alert('PDF creation failed: '+err.message)}
  });

  function initCanvas(canvas,color,width,clear,undo,save){
    if(!canvas)return;const ctx=canvas.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';let down=false,last=null,history=[];
    const snapshot=()=>{history.push(ctx.getImageData(0,0,canvas.width,canvas.height));if(history.length>20)history.shift()};
    const pos=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};
    canvas.addEventListener('pointerdown',e=>{snapshot();down=true;last=pos(e);canvas.setPointerCapture?.(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{if(!down)return;const p=pos(e);ctx.strokeStyle=$(color).value;ctx.lineWidth=Number($(width).value)||4;ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p});
    const end=()=>{down=false;last=null};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    $(clear).onclick=()=>{snapshot();ctx.clearRect(0,0,canvas.width,canvas.height)};
    $(undo).onclick=()=>{const prev=history.pop();if(prev)ctx.putImageData(prev,0,0)};
    $(save).onclick=()=>canvas.toBlob(b=>downloadBlob(b,'drawing.png'),'image/png');
  }
  initCanvas($('#tool-draw-canvas'),'#tool-draw-color','#tool-draw-width','#tool-draw-clear','#tool-draw-undo','#tool-draw-save');

  $('#pick-meal')?.addEventListener('click',()=>{
    const opts=$('#meal-options').value.split(/\n|,/).map(x=>x.trim()).filter(Boolean);if(!opts.length)return;
    const result=$('#meal-result');let n=0;const timer=setInterval(()=>{result.textContent=opts[Math.floor(Math.random()*opts.length)];n++;if(n>14){clearInterval(timer);const pick=opts[Math.floor(Math.random()*opts.length)];result.textContent=pick;result.animate([{transform:'scale(.85)',opacity:.4},{transform:'scale(1.08)',opacity:1},{transform:'scale(1)',opacity:1}],{duration:450})}},70);
  });
})();
