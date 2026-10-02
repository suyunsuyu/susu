(() => {
const stack="'Agdasima','Nanum Barunpen','ChillHuoFangSong'";
const fonts={english:stack,korean:"'Nanum Barunpen','ChillHuoFangSong','Agdasima'",chinese:"'ChillHuoFangSong','Nanum Barunpen','Agdasima'"};
function normalize(root){const nodes=root.nodeType===1?[root,...root.querySelectorAll('select,[style]')]:[...document.querySelectorAll('select,[style]')];nodes.forEach(el=>{
if(el.tagName==='SELECT'&&/font/.test(el.id)&&!/size/.test(el.id)&&!el.dataset.threeFonts){const old=el.value,opts=[...el.options],family=opts.some(o=>['Agdasima','Caveat','Noto Sans SC'].includes(o.value));el.replaceChildren(...['english','korean','chinese'].map((key,i)=>{const o=document.createElement('option');o.value=family?['Agdasima','Nanum Barunpen','ChillHuoFangSong'][i]:key;o.textContent=['English · Agdasima','한국어 · Nanum Barunpen','中文 · 寒蝉活仿宋'][i];return o}));el.value=[...el.options].some(o=>o.value===old)?old:el.options[0].value;el.dataset.threeFonts='true';}
const family=el.style?.fontFamily;if(family){const first=family.split(',')[0].replace(/['"]/g,'').trim();const key=first==='Nanum Barunpen'?'korean':first==='ChillHuoFangSong'?'chinese':'english';if(el.style.getPropertyPriority('font-family')!=='important'||family!==fonts[key])el.style.setProperty('font-family',fonts[key],'important');}
});}
const observer=new MutationObserver(records=>{observer.disconnect();for(const r of records){if(r.type==='childList')r.addedNodes.forEach(n=>{if(n.nodeType===1)normalize(n)});else normalize(r.target);}observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});});
function init(){normalize(document);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();