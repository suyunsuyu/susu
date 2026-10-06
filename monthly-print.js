(() => {
  const pad=n=>String(n).padStart(2,'0');
  const photos=e=>Array.isArray(e?.images)?e.images:(e?.image?[e.image]:[]);
  const loadImage=src=>new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>reject(Error('사진을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'));im.src=src;});
  async function create(year,month,items){
    await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1600;const c=canvas.getContext('2d');
    c.fillStyle='#fafaf7';c.fillRect(0,0,1800,1600);c.fillStyle='#222';c.font="42px 'Nanum Barunpen', 'ChillHuoFangSong', 'Agdasima'";c.fillText(`${year}.${pad(month+1)}`,100,100);
    const offset=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate(),rows=Math.ceil((offset+days)/7),w=1600/7,h=1300/rows;
    c.font="22px 'Nanum Barunpen'";['일','월','화','수','목','금','토'].forEach((s,i)=>c.fillText(s,110+i*w,165));
    for(let n=0;n<rows*7;n++){
      const x=100+(n%7)*w,y=190+Math.floor(n/7)*h;c.strokeStyle='#d4d5d2';c.lineWidth=1;c.strokeRect(x,y,w,h);
      const day=n-offset+1;if(day<1||day>days)continue;const date=`${year}-${pad(month+1)}-${pad(day)}`,entries=items.filter(e=>e.date===date),entry=entries[0];
      c.fillStyle='#333';c.font="20px 'Agdasima'";c.fillText(pad(day),x+10,y+25);
      const src=entries.flatMap(photos)[0];if(src){const im=await loadImage(src),iw=w-24,ih=h-80,scale=Math.min(iw/im.width,ih/im.height),dw=im.width*scale,dh=im.height*scale;c.drawImage(im,x+(w-dw)/2,y+35+(ih-dh)/2,dw,dh);}
      c.save();c.beginPath();c.rect(x+10,y+h-38,w-20,30);c.clip();c.fillStyle='#111';c.font="22px 'Nanum Barunpen', 'ChillHuoFangSong', 'Agdasima'";
      let title=String(entry?.title||entry?.text||'').split('\n')[0];while(title.length&&c.measureText(title).width>w-24)title=title.slice(0,-1);c.fillText(title,x+12,y+h-16);c.restore();
    }
    return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('달력을 만들지 못했어요.')),'image/jpeg',.96));
  }
  async function download(year,month,items,button){
    const original=button?.textContent;if(button){button.disabled=true;button.textContent='인쇄 중…';}
    try{const blob=await create(year,month,items),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`calendar-${year}-${pad(month+1)}.jpg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(e){alert(e.message);}finally{if(button){button.disabled=false;button.textContent=original;}}
  }
  window.SUY_MONTHLY={create,download};
})();
