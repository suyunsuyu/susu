(() => {
const stack="'Agdasima','Nanum Barunpen','ChisugaShotai'";
const fonts={english:stack,korean:"'Nanum Barunpen','ChisugaShotai','Agdasima'",chinese:"'ChisugaShotai','Nanum Barunpen','Agdasima'"};
function normalize(root){const nodes=root.nodeType===1?[root,...root.querySelectorAll('select,[style]')]:[...document.querySelectorAll('select,[style]')];nodes.forEach(el=>{
if(el.tagName==='SELECT'&&/font/.test(el.id)&&!/size/.test(el.id)&&!el.dataset.threeFonts){const old=el.value,opts=[...el.options],family=opts.some(o=>['Agdasima','Caveat','Noto Sans SC'].includes(o.value));el.replaceChildren(...['english','korean','chinese'].map((key,i)=>{const o=document.createElement('option');o.value=family?['Agdasima','Nanum Barunpen','ChisugaShotai'][i]:key;o.textContent=['English · Agdasima','한국어 · Nanum Barunpen','中文 · 千菅书体'][i];return o}));el.value=[...el.options].some(o=>o.value===old)?old:el.options[0].value;el.dataset.threeFonts='true';}
if(el.matches('body.ppt-home #notebook-margin-text,body.ppt-home #margin-words')){el.style.removeProperty('font-family');return;}
const family=el.style?.fontFamily;if(family){const first=family.split(',')[0].replace(/['"]/g,'').trim();const key=first==='Nanum Barunpen'?'korean':['ChillHuoFangSong','ChisugaShotai'].includes(first)?'chinese':'english';if(el.style.getPropertyPriority('font-family')!=='important'||family!==fonts[key])el.style.setProperty('font-family',fonts[key],'important');}
});}
const observer=new MutationObserver(records=>{observer.disconnect();for(const r of records){if(r.type==='childList')r.addedNodes.forEach(n=>{if(n.nodeType===1)normalize(n)});else normalize(r.target);}observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});});
function init(){normalize(document);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
;(()=>{
 document.addEventListener('click',e=>{
  const link=e.target.closest('.notebook-contact a[href^="mailto:"]');if(!link)return;
  e.preventDefault();let panel=document.getElementById('contact-email-address');
  if(!panel){panel=document.createElement('div');panel.id='contact-email-address';panel.setAttribute('role','status');panel.style.cssText='position:fixed;right:24px;bottom:74px;z-index:1000;padding:12px 16px;background:#fff;color:#555;font-size:14px;box-shadow:0 3px 18px #0000000c;border:1px solid #eeeeee';document.body.append(panel);}
  panel.hidden=!panel.hidden&&panel.childNodes.length>0;
  panel.textContent=decodeURIComponent(link.getAttribute('href').slice(7).split('?')[0]);
  link.setAttribute('aria-expanded',String(!panel.hidden));
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const p=document.getElementById('contact-email-address');if(p)p.hidden=true;}});
 document.addEventListener('click',e=>{if(!e.target.closest('.notebook-contact,#contact-email-address')){const p=document.getElementById('contact-email-address');if(p)p.hidden=true;}});
})();

;(()=>{const css=document.createElement('style');css.textContent=`html,body{background:#0b0c11!important;background-image:none!important}body{color:#e1e1e7}body>header,body>main,body>footer{background:transparent!important}body>header a,body .notebook-contact a{color:#d5d5dc}body .notebook-contact{background:transparent!important}body dialog{color:#333}`;document.head.append(css)})();
