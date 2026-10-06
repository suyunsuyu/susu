(() => {
  const pad=n=>String(n).padStart(2,'0');
  const photos=e=>Array.isArray(e?.images)?e.images:(e?.image?[e.image]:[]);
  const loadImage=src=>new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';const timeout=setTimeout(()=>reject(Error('사진을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')),15000);im.onload=()=>{clearTimeout(timeout);resolve(im)};im.onerror=()=>{clearTimeout(timeout);reject(Error('사진을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'))};im.src=src;});
  async function drawBackground(c){
    c.fillStyle='#ffffff';c.fillRect(0,0,1800,1600);
    // Use the same administrator photo library and quiet treatment as postcards.
    let settings;try{if(window.SUY_SITE_READY)await window.SUY_SITE_READY;settings=await window.SUY_ADMIN?.loadContent('notebook-settings');}catch{return;}
    const library=(Array.isArray(settings?.backgrounds)?settings.backgrounds:[]).filter(src=>/^https?:\/\//i.test(String(src)));
    if(!library.length)return;
    let im;try{im=await loadImage(library[Math.floor(Math.random()*library.length)])}catch{return;}
    const scale=Math.min(1080/im.width,960/im.height);
    c.save();c.globalAlpha=.13;c.filter='grayscale(1) contrast(.65)';c.drawImage(im,(1800-im.width*scale)/2,(1600-im.height*scale)/2,im.width*scale,im.height*scale);c.restore();
  }
  async function create(year,month,items){
    await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1600;const c=canvas.getContext('2d');
    await drawBackground(c);c.fillStyle='#444';c.font="26px 'Agdasima', 'Nanum Barunpen', 'ChillHuoFangSong'";c.fillText(`${year}.${pad(month+1)}`,100,100);
    const offset=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate(),rows=Math.ceil((offset+days)/7),w=1600/7,h=1300/rows;
    c.font="18px 'Nanum Barunpen'";['일','월','화','수','목','금','토'].forEach((s,i)=>c.fillText(s,110+i*w,165));
    for(let n=0;n<rows*7;n++){
      const x=100+(n%7)*w,y=190+Math.floor(n/7)*h;c.strokeStyle='#d4d5d2';c.lineWidth=1;c.strokeRect(x,y,w,h);
      const day=n-offset+1;if(day<1||day>days)continue;const date=`${year}-${pad(month+1)}-${pad(day)}`,entries=items.filter(e=>e.date===date),entry=entries[0];
      c.fillStyle='#555';c.font="16px 'Agdasima'";c.fillText(pad(day),x+10,y+23);
      const src=entries.flatMap(photos)[0];if(src){const im=await loadImage(src),iw=w-24,ih=h-80,scale=Math.min(iw/im.width,ih/im.height),dw=im.width*scale,dh=im.height*scale;c.drawImage(im,x+(w-dw)/2,y+35+(ih-dh)/2,dw,dh);}
      c.save();c.beginPath();c.rect(x+10,y+h-38,w-20,30);c.clip();c.fillStyle='#111';c.font="22px 'Nanum Barunpen', 'ChillHuoFangSong', 'Agdasima'";
      let title=String(entry?.title||entry?.text||'').split('\n')[0];while(title.length&&c.measureText(title).width>w-24)title=title.slice(0,-1);c.fillText(title,x+12,y+h-16);c.restore();
    }
    return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('달력을 만들지 못했어요.')),'image/jpeg',.96));
  }
  async function download(year,month,items,button){
    const original=button?.textContent;if(button){button.disabled=true;button.textContent='인쇄 중…';}
    try{const blob=await create(year,month,items),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`calendar-${year}-${pad(month+1)}.jpg`;a.textContent='JPG 다운로드 ↓';a.className='calendar-jpg-download';const previous=button?.parentElement.querySelector('.calendar-jpg-download');if(previous){URL.revokeObjectURL(previous.href);previous.remove();}if(button)button.insertAdjacentElement('afterend',a);else document.body.append(a);a.click();}catch(e){alert(e.message);}finally{if(button){button.disabled=false;button.textContent=original;}}
  }
  window.SUY_MONTHLY={create,download};
})();
