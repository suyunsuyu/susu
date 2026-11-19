(()=>{
'use strict';
const track=document.querySelector('#cat-photo-grid'),thumbs=document.querySelector('#corridor-thumbnails'),count=document.querySelector('#corridor-count'),play=document.querySelector('#corridor-play'),previous=document.querySelector('#corridor-prev'),next=document.querySelector('#corridor-next');
const tv=document.querySelector('.retro-tv'),screen=document.querySelector('#tv-screen'),power=document.querySelector('#tv-power'),tvPhoto=document.querySelector('#tv-photo'),noSignal=document.querySelector('#tv-no-signal'),channelLabel=document.querySelector('#tv-channel-label'),stateLabel=document.querySelector('#tv-state-label'),dial=document.querySelector('#tv-channel');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let photos=[],tvPhotos=[],selected=0,wantsPlayback=true,playing=false,playTimer=null,powerTimer=null,channelTimer=null,scrollFrame=null,dialAngle=0,navigationTimer=null,programmaticScroll=false;
let tvOn=false,tvIndex=0;
const pad=n=>String(n).padStart(2,'0');
function showChannel(index){tvIndex=tvPhotos.length?(index+tvPhotos.length)%tvPhotos.length:0;const item=tvPhotos[tvIndex];tvPhoto.hidden=!item;noSignal.hidden=!!item;if(item){if(tvPhoto.getAttribute('src')!==item.src)tvPhoto.src=item.src;tvPhoto.alt=item.alt||'Television photo '+(tvIndex+1);}else{tvPhoto.removeAttribute('src');tvPhoto.alt='';}channelLabel.textContent=item?'CH '+pad(tvIndex+1):'CH --';if(tvOn)stateLabel.textContent=item?'On air · CH '+pad(tvIndex+1):'On · No television photos uploaded';}
function setPower(on){if(on===tvOn)return;tvOn=on;clearTimeout(powerTimer);clearTimeout(channelTimer);tv.classList.remove('is-tuning');for(const b of [screen,power]){b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Turn television off':'Turn television on');}tv.dataset.state=on?'starting':'stopping';if(on){showChannel(tvIndex);stateLabel.textContent=tvPhotos.length?'Warming up…':'On · No television photos uploaded';}else stateLabel.textContent='Turning off…';powerTimer=setTimeout(()=>{tv.dataset.state=on?'on':'off';if(on)showChannel(tvIndex);else stateLabel.textContent='Television is off';},reduced.matches?30:on?850:650);}
function tune(step){if(!tvOn){setPower(true);return;}if(!tvPhotos.length)return;showChannel(tvIndex+step);dialAngle+=step*32;dial.style.setProperty('--dial-angle',dialAngle+'deg');tv.classList.remove('is-tuning');void tv.offsetWidth;tv.classList.add('is-tuning');clearTimeout(channelTimer);channelTimer=setTimeout(()=>tv.classList.remove('is-tuning'),220);}
function updateSelection(){count.textContent=photos.length?pad(selected+1)+' / '+pad(photos.length):'00 / 00';thumbs.querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('is-selected',i===selected);b.setAttribute('aria-pressed',String(i===selected));});}
function select(index){if(!photos.length)return;selected=(index+photos.length)%photos.length;programmaticScroll=true;clearTimeout(navigationTimer);navigationTimer=setTimeout(()=>programmaticScroll=false,650);track.scrollTo({left:selected*track.clientWidth,behavior:reduced.matches?'instant':'smooth'});updateSelection();}
function stop(){playing=false;clearInterval(playTimer);playTimer=null;play.textContent='Play';play.setAttribute('aria-pressed','false');}
function start(){if(playing||photos.length<2||document.hidden)return;playing=true;play.textContent='Pause';play.setAttribute('aria-pressed','true');playTimer=setInterval(()=>select(selected+1),5000);}
function manualSelect(index){select(index);if(playing){stop();start();}}
previous.onclick=()=>manualSelect(selected-1);next.onclick=()=>manualSelect(selected+1);play.onclick=()=>{wantsPlayback=!playing;if(playing)stop();else start();};
track.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();manualSelect(selected+(e.key==='ArrowRight'?1:-1));}});
track.addEventListener('scroll',()=>{if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=null;if(programmaticScroll||!photos.length||!track.clientWidth)return;const index=Math.min(photos.length-1,Math.max(0,Math.round(track.scrollLeft/track.clientWidth)));if(index!==selected){selected=index;updateSelection();}});},{passive:true});
for(const event of ['pointerdown','touchstart','wheel'])track.addEventListener(event,()=>{programmaticScroll=false;clearTimeout(navigationTimer);if(playing){stop();start();}},{passive:true});
document.querySelector('#cat-photos-open').addEventListener('click',stop);track.addEventListener('dblclick',stop);
document.addEventListener('close',e=>{if(e.target.id==='cat-photo-editor'&&wantsPlayback)start();},true);
new ResizeObserver(()=>{if(photos.length)track.scrollTo({left:selected*track.clientWidth,behavior:'instant'});}).observe(track);
for(const b of [screen,power])b.onclick=()=>setPower(!tvOn);
dial.onclick=()=>tune(1);document.querySelector('#tv-prev').onclick=()=>tune(-1);document.querySelector('#tv-next').onclick=()=>tune(1);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(wantsPlayback)start();});
document.addEventListener('umi-photos-updated',e=>{
 const previousId=photos[selected]?.id;photos=e.detail.items||[];stop();selected=Math.max(0,photos.findIndex(p=>p.id===previousId));track.replaceChildren();thumbs.replaceChildren();
 if(!photos.length){const empty=document.createElement('div');empty.className='corridor-empty';empty.setAttribute('aria-label','No photos yet');track.append(empty);}
 photos.forEach((item,i)=>{const slide=document.createElement('button');slide.type='button';slide.className='corridor-slide';slide.setAttribute('aria-label','Select corridor photo '+(i+1));const image=document.createElement('img');image.src=item.src;image.alt=item.alt||'Umi photo '+(i+1);image.loading=i<2?'eager':'lazy';image.decoding='async';slide.append(image);slide.onclick=()=>manualSelect(i);track.append(slide);
 const thumb=document.createElement('button');thumb.type='button';thumb.setAttribute('aria-label','Select photo '+(i+1));const mini=document.createElement('img');mini.src=item.src;mini.alt='';mini.loading='lazy';thumb.append(mini);thumb.onclick=()=>manualSelect(i);thumbs.append(thumb);});
 previous.disabled=next.disabled=play.disabled=photos.length<2;updateSelection();track.scrollTo({left:selected*track.clientWidth,behavior:'instant'});if(wantsPlayback)start();
});
document.addEventListener('umi-tv-photos-updated',e=>{const currentId=tvPhotos[tvIndex]?.id;tvPhotos=e.detail.items||[];tvIndex=Math.max(0,tvPhotos.findIndex(p=>p.id===currentId));showChannel(tvIndex);});
previous.disabled=next.disabled=play.disabled=true;
})();
