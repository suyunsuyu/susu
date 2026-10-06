(() => {
const stack="'Agdasima','Nanum Barunpen','ChisugaShotai'";
const fonts={english:stack,korean:"'Nanum Barunpen','ChisugaShotai','Agdasima'",chinese:"'ChisugaShotai','Nanum Barunpen','Agdasima'"};
function normalize(root){const nodes=root.nodeType===1?[root,...root.querySelectorAll('select,[style]')]:[...document.querySelectorAll('select,[style]')];nodes.forEach(el=>{
if(el.tagName==='SELECT'&&/font/.test(el.id)&&!/size/.test(el.id)&&!el.dataset.threeFonts){const old=el.value,opts=[...el.options],family=opts.some(o=>['Agdasima','Caveat','Noto Sans SC'].includes(o.value));el.replaceChildren(...['english','korean','chinese'].map((key,i)=>{const o=document.createElement('option');o.value=family?['Agdasima','Nanum Barunpen','ChisugaShotai'][i]:key;o.textContent=['English · Agdasima','한국어 · Nanum Barunpen','中文 · 千菅书体'][i];return o}));el.value=[...el.options].some(o=>o.value===old)?old:el.options[0].value;el.dataset.threeFonts='true';}
const family=el.style?.fontFamily;if(family){const first=family.split(',')[0].replace(/['"]/g,'').trim();const key=first==='Nanum Barunpen'?'korean':['ChillHuoFangSong','ChisugaShotai'].includes(first)?'chinese':'english';if(el.style.getPropertyPriority('font-family')!=='important'||family!==fonts[key])el.style.setProperty('font-family',fonts[key],'important');}
});}
const observer=new MutationObserver(records=>{observer.disconnect();for(const r of records){if(r.type==='childList')r.addedNodes.forEach(n=>{if(n.nodeType===1)normalize(n)});else normalize(r.target);}observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});});
function init(){normalize(document);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();