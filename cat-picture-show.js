(()=>{
'use strict';
const track=document.querySelector('#cat-photo-grid'),play=document.querySelector('#corridor-play');
const tv=document.querySelector('.retro-tv'),screen=document.querySelector('#tv-screen'),power=document.querySelector('#tv-power'),tvPhoto=document.querySelector('#tv-photo'),noSignal=document.querySelector('#tv-no-signal'),channelLabel=document.querySelector('#tv-channel-label'),stateLabel=document.querySelector('#tv-state-label'),dial=document.querySelector('#tv-channel');
const thumbs=document.querySelector('#corridor-thumbnails'),tvVideo=document.querySelector('#tv-video'),sound=document.querySelector('#tv-sound');
let allTVMedia=[],tvMode='photo';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let photos=[],tvPhotos=[],wantsPlayback=true,frameId=null,lastTime=0,offset=0,loopWidth=0,belt=null,powerTimer=null,channelTimer=null,dialAngle=0,drag=null;
let tvOn=false,tvIndex=0;
const pad=n=>String(n).padStart(2,'0');
function syncVideo(){if(tvOn&&tvMode==='video'&&!tvVideo.hidden&&!document.hidden&&!document.querySelector('#tv-photo-editor')?.open)tvVideo.play().catch(error=>{if(error.name!=='AbortError')stateLabel.textContent='Video could not play. Try MP4 or WebM.';});else tvVideo.pause();}
function showChannel(index){tvIndex=tvPhotos.length?(index+tvPhotos.length)%tvPhotos.length:0;const item=tvPhotos[tvIndex],isVideo=tvMode==='video';tvPhoto.hidden=!item||isVideo;tvVideo.hidden=!item||!isVideo;noSignal.hidden=!!item;tvVideo.pause();if(item){const media=isVideo?tvVideo:tvPhoto;if(media.getAttribute('src')!==item.src)media.src=item.src;if(isVideo)tvPhoto.removeAttribute('src');else{tvVideo.removeAttribute('src');tvVideo.load();tvPhoto.alt=item.alt||'Television photo';}tvVideo.setAttribute('aria-label',isVideo?item.alt||'Television video':'Television video');}else{tvPhoto.removeAttribute('src');tvVideo.removeAttribute('src');tvVideo.load();}sound.hidden=!isVideo||!item;channelLabel.textContent=item?'CH '+pad(tvIndex+1):'CH --';noSignal.textContent=isVideo?'NO VIDEOS':'NO PHOTOS';if(tvOn)stateLabel.textContent=item?'On air · CH '+pad(tvIndex+1):'No '+(isVideo?'videos':'photos')+' uploaded';syncVideo();}
function chooseMode(mode){tvMode=mode;tvPhotos=allTVMedia.filter(i=>(i.type==='video'?'video':'photo')===mode);for(const type of ['photo','video'])document.querySelector('#tv-mode-'+type).setAttribute('aria-pressed',String(type===mode));showChannel(0);}
for(const mode of ['photo','video'])document.querySelector('#tv-mode-'+mode).onclick=()=>chooseMode(mode);
sound.onclick=()=>{tvVideo.muted=!tvVideo.muted;sound.setAttribute('aria-pressed',String(!tvVideo.muted));sound.textContent=tvVideo.muted?'SOUND':'MUTE';};
function setPower(on){if(on===tvOn)return;tvOn=on;clearTimeout(powerTimer);clearTimeout(channelTimer);tv.classList.remove('is-tuning');for(const b of [screen,power]){b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Turn television off':'Turn television on');}tv.dataset.state=on?'starting':'stopping';if(on){showChannel(tvIndex);stateLabel.textContent=tvPhotos.length?'Warming up…':'On · No television photos uploaded';}else stateLabel.textContent='Turning off…';syncVideo();powerTimer=setTimeout(()=>{tv.dataset.state=on?'on':'off';if(on)showChannel(tvIndex);else stateLabel.textContent='Television is off';},reduced.matches?30:on?850:650);}
function tune(step){if(!tvOn){setPower(true);return;}if(!tvPhotos.length)return;showChannel(tvIndex+step);dialAngle+=step*32;dial.style.setProperty('--dial-angle',dialAngle+'deg');tv.classList.remove('is-tuning');void tv.offsetWidth;tv.classList.add('is-tuning');clearTimeout(channelTimer);channelTimer=setTimeout(()=>tv.classList.remove('is-tuning'),220);}
function markThumb(){if(!photos.length||!loopWidth)return;const index=Math.round(offset/(loopWidth/photos.length))%photos.length;for(const [i,b] of [...thumbs.children].entries())b.setAttribute('aria-pressed',String(i===index));}
function drawBelt(){if(belt&&loopWidth>0){offset=((offset%loopWidth)+loopWidth)%loopWidth;belt.style.transform='translate3d('+(-offset)+'px,0,0)';markThumb();}}
function updatePlay(){play.disabled=!photos.length;play.dataset.playing=String(wantsPlayback);play.setAttribute('aria-pressed',String(wantsPlayback));play.setAttribute('aria-label',wantsPlayback?'Pause slideshow':'Play slideshow');}
function frame(time){frameId=null;if(!wantsPlayback||document.hidden||drag||!loopWidth)return;if(lastTime)offset+=Math.min(time-lastTime,64)*.032;lastTime=time;drawBelt();frameId=requestAnimationFrame(frame);}
function stopFrames(){if(frameId!==null)cancelAnimationFrame(frameId);frameId=null;lastTime=0;}
function resume(){if(frameId===null&&wantsPlayback&&!document.hidden&&!drag&&loopWidth>0){lastTime=0;frameId=requestAnimationFrame(frame);}}
function measure(){if(!belt)return;const old=loopWidth;track.style.setProperty('--corridor-slide-width',track.clientWidth+'px');loopWidth=belt.firstElementChild.getBoundingClientRect().width;if(old&&loopWidth)offset=offset/old*loopWidth;drawBelt();resume();}
play.onclick=()=>{wantsPlayback=!wantsPlayback;updatePlay();if(wantsPlayback)resume();else stopFrames();};
track.addEventListener('pointerdown',e=>{if(!photos.length||e.button!==0)return;drag={x:e.clientX,offset};stopFrames();track.setPointerCapture(e.pointerId);});
track.addEventListener('pointermove',e=>{if(!drag)return;offset=drag.offset+drag.x-e.clientX;drawBelt();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])track.addEventListener(name,()=>{drag=null;resume();});
track.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();offset+=(e.key==='ArrowRight'?1:-1)*track.clientWidth/3;drawBelt();}});
document.querySelector('#cat-photos-open').addEventListener('click',stopFrames);track.addEventListener('dblclick',stopFrames);
document.querySelector('#tv-photos-open').addEventListener('click',()=>tvVideo.pause());
document.addEventListener('close',e=>{if(e.target.id==='cat-photo-editor')resume();if(e.target.id==='tv-photo-editor')syncVideo();},true);
new ResizeObserver(measure).observe(track);
for(const b of [screen,power])b.onclick=()=>setPower(!tvOn);
dial.onclick=()=>tune(1);document.querySelector('#tv-prev').onclick=()=>tune(-1);document.querySelector('#tv-next').onclick=()=>tune(1);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopFrames();else resume();syncVideo();});
document.addEventListener('umi-photos-updated',e=>{
 stopFrames();photos=e.detail.items||[];offset=0;loopWidth=0;belt=null;track.replaceChildren();thumbs.replaceChildren();
 if(!photos.length){const empty=document.createElement('div');empty.className='corridor-empty';empty.setAttribute('aria-label','No photos yet');track.append(empty);}
 else{belt=document.createElement('div');belt.className='corridor-belt';for(let copy=0;copy<2;copy++){const group=document.createElement('div');group.className='corridor-group';if(copy)group.setAttribute('aria-hidden','true');for(const [i,item] of photos.entries()){const slide=document.createElement('div');slide.className='corridor-slide';const image=document.createElement('img');image.src=item.src;image.alt=copy?'':item.alt||'Umi photo '+(i+1);image.draggable=false;image.decoding='async';slide.append(image);group.append(slide);}belt.append(group);}track.append(belt);measure();}
 for(const [i,item] of photos.entries()){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',item.alt||'Select photo');b.setAttribute('aria-pressed','false');const image=document.createElement('img');image.src=item.src;image.alt='';image.loading='lazy';b.append(image);b.onclick=()=>{wantsPlayback=false;stopFrames();offset=i*loopWidth/photos.length;drawBelt();updatePlay();};thumbs.append(b);}markThumb();
 updatePlay();resume();
});
document.addEventListener('umi-tv-photos-updated',e=>{const currentId=tvPhotos[tvIndex]?.id;allTVMedia=e.detail.items||[];tvPhotos=allTVMedia.filter(i=>(i.type==='video'?'video':'photo')===tvMode);tvIndex=Math.max(0,tvPhotos.findIndex(p=>p.id===currentId));showChannel(tvIndex);});
updatePlay();
})();
