(() => {
  'use strict';
  const home=document.body.classList.contains('cargo-home');
  const cat=document.body.classList.contains('umi-page');
  if(!home&&!cat)return;
  const key=home?'page-writing-home':'page-writing-umi';
  const specs=home?[['intro','#notebook-margin-text','Introduction'],['quote','.cargo-quote p','Quotation'],['credit','.cargo-quote cite','Quotation credit'],['info','#cargo-info p','Information'],['mood','.cargo-mood','Mood label'],...['cat','message','work'].map((id,i)=>['nav-'+id,`.cargo-navigation a:nth-of-type(${i+1})`,'Navigation · '+id]),['nav-info','#cargo-info-open','Navigation · info']]:[
    ...[...document.querySelectorAll('[data-umi-text]')].filter(el=>!el.closest('.umi-traits')).map(el=>[el.dataset.umiText,`[data-umi-text="${el.dataset.umiText}"]`,el.dataset.umiText]),['traits','.umi-traits','Article 1 · Full list']
  ];
  const blocks=specs.map(([id,selector,label])=>({id,el:document.querySelector(selector),label})).filter(b=>b.el);
  const fonts={caption:'"Times New Roman",Times,serif',sans:'Arial,Helvetica,sans-serif',mono:'"Courier New",monospace',korean:'"Nanum Barunpen",sans-serif',chinese:'"ChillHuoFangSong",serif'};
  let payload={blocks:{}},ready=false,active=null,dirty=false;
  const allowed=new Set(['P','DIV','BR','B','STRONG','I','EM','U','S','UL','OL','LI','SPAN','H1','H2','H3','BLOCKQUOTE']);
  function cleanHTML(value){
    const doc=new DOMParser().parseFromString(String(value),'text/html');
    const walk=node=>{
      const out=document.createDocumentFragment();
      for(const child of node.childNodes){
        if(child.nodeType===3){child.textContent.split('\n').forEach((line,i)=>{if(i)out.append(document.createElement('br'));out.append(document.createTextNode(line));});continue;}
        if(child.nodeType!==1)continue;
        if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','IMG','FORM'].includes(child.tagName))continue;
        const content=walk(child);if(!allowed.has(child.tagName)){out.append(content);continue;}
        const el=document.createElement(child.tagName.toLowerCase());
        for(const property of ['font-weight','font-style','text-decoration','text-align','color']){const val=child.style.getPropertyValue(property);if(val&&!/[<>]|url\(|expression/i.test(val))el.style.setProperty(property,val);}
        el.append(content);out.append(el);
      }return out;
    };
    const root=document.createElement('div');root.append(walk(doc.body));return root.innerHTML;
  }
  function apply(id){
    const block=blocks.find(b=>b.id===id),saved=payload.blocks?.[id];if(!block||!saved)return;
    block.el.innerHTML=cleanHTML(saved.html);block.el.classList.add('writing-content');
    const st=saved.style||{};
    if(fonts[st.font])block.el.style.setProperty('font-family',fonts[st.font],'important');
    for(const [prop,min,max,unit] of [['font-size',8,100,'px'],['line-height',.8,3,''],['letter-spacing',-2,12,'px'],['margin-top',0,300,'px'],['margin-bottom',0,300,'px'],['width',20,100,'%']]){const value=Number(st[prop]);if(Number.isFinite(value))block.el.style.setProperty(prop,Math.min(max,Math.max(min,value))+unit,'important');}
    if(/^#[a-f\d]{6}$/i.test(st.color||''))block.el.style.setProperty('color',st.color,'important');
    if(['left','center','right','justify'].includes(st.align))block.el.style.setProperty('text-align',st.align,'important');
    if(['400','700'].includes(st.weight))block.el.style.setProperty('font-weight',st.weight,'important');
    if(['normal','italic'].includes(st.slant))block.el.style.setProperty('font-style',st.slant,'important');
    if(['normal','small-caps'].includes(st.caps))block.el.style.setProperty('font-variant',st.caps,'important');
    if(home&&id==='intro'){const shadow=document.querySelector('.cargo-word-shadow');shadow.innerHTML=block.el.innerHTML;shadow.style.fontSize=getComputedStyle(block.el).fontSize;shadow.style.lineHeight=getComputedStyle(block.el).lineHeight;document.querySelector('.home-note-pager').hidden=true;}
  }
  function applyLayouts(){if(!cat)return;for(const [name,selector]of [['first','.umi-yellow'],['second','.umi-green']]){const value=payload.layouts?.[name];if(!value)continue;const section=document.querySelector(selector);if(Number.isFinite(Number(value.padding)))section.style.padding=Math.min(100,Math.max(8,Number(value.padding)))+'px';section.querySelectorAll('.umi-grid').forEach(grid=>{if(Number.isFinite(Number(value.left)))grid.style.setProperty('grid-template-columns',`${Math.min(65,Math.max(20,Number(value.left)))}% minmax(0,1fr)`);if(Number.isFinite(Number(value.gap)))grid.style.gap=Math.min(100,Math.max(0,Number(value.gap)))+'px';});} }
  document.body.insertAdjacentHTML('beforeend',`<dialog id="writing-dialog"><div class="writing-head"><h2>PAGE WRITING</h2><button id="writing-close" type="button" aria-label="Close writing editor">×</button></div><label>TEXT BLOCK<select id="writing-block"></select></label><div class="writing-controls"><label>FONT<select id="writing-font"><option value="caption">Caption / Times</option><option value="sans">Arial</option><option value="mono">Monospace</option><option value="korean">한국어</option><option value="chinese">中文</option></select></label><label>SIZE<input id="writing-size" type="number" min="8" max="100"></label><label>LINE HEIGHT<input id="writing-leading" type="number" min="0.8" max="3" step="0.05"></label><label>LETTER SPACING<input id="writing-spacing" type="number" min="-2" max="12" step="0.1"></label><label>COLOR<input id="writing-color" type="color"></label><label>ALIGN<select id="writing-align"><option>left</option><option>center</option><option>right</option><option>justify</option></select></label><label>WIDTH %<input id="writing-width" type="number" min="20" max="100"></label><label>SPACE ABOVE<input id="writing-top" type="number" min="0" max="300"></label><label>SPACE BELOW<input id="writing-bottom" type="number" min="0" max="300"></label></div><div class="writing-commands"><button type="button" data-command="bold"><b>B</b></button><button type="button" data-command="italic"><i>I</i></button><button type="button" data-command="underline"><u>U</u></button><button type="button" data-command="insertUnorderedList">BULLETS</button><button type="button" data-command="insertOrderedList">NUMBERED LIST</button><button type="button" data-command="removeFormat">CLEAR FORMAT</button><button type="button" data-command="undo">UNDO</button><button type="button" data-command="redo">REDO</button></div><div id="writing-canvas" contenteditable="true" role="textbox" aria-label="Article text" aria-multiline="true"></div><div class="writing-actions"><button id="writing-save" type="button">SAVE CHANGES</button><button id="writing-cancel" type="button">CANCEL</button><span id="writing-status" class="writing-status" role="status"></span></div></dialog>`);
  const $=s=>document.querySelector(s),dialog=$('#writing-dialog'),canvas=$('#writing-canvas'),status=$('#writing-status'),select=$('#writing-block');
  blocks.forEach(b=>{const o=document.createElement('option');o.value=b.id;o.textContent=b.label;select.append(o);});
  const fields={'font-size':'size','line-height':'leading','letter-spacing':'spacing',width:'width','margin-top':'top','margin-bottom':'bottom'};
  let layoutSection='first',layoutDirty=false;
  if(cat){const panel=document.createElement('div');panel.className='writing-controls';panel.innerHTML='<label>ARTICLE LAYOUT<select id="writing-article"><option value="first">First article</option><option value="second">Second article</option></select></label><label>LEFT COLUMN %<input id="writing-column" type="number" min="20" max="65"></label><label>COLUMN GAP<input id="writing-gap" type="number" min="0" max="100"></label><label>PAGE PADDING<input id="writing-padding" type="number" min="8" max="100"></label>';$('#writing-dialog .writing-commands').before(panel);panel.addEventListener('input',e=>{if(e.target.id!=='writing-article')layoutDirty=true;});$('#writing-article').onchange=()=>{collectLayout();layoutSection=$('#writing-article').value;showLayout();};}
  function collectLayout(){if(!cat||!layoutDirty)return;payload.layouts||={};payload.layouts[layoutSection]={left:Number($('#writing-column').value),gap:Number($('#writing-gap').value),padding:Number($('#writing-padding').value)};}
  function showLayout(){if(!cat)return;layoutDirty=false;$('#writing-article').value=layoutSection;const section=document.querySelector(layoutSection==='first'?'.umi-yellow':'.umi-green'),saved=payload.layouts?.[layoutSection]||{};$('#writing-column').value=saved.left??33;$('#writing-gap').value=saved.gap??36;$('#writing-padding').value=saved.padding??(parseFloat(getComputedStyle(section).paddingLeft)||40);}
  for(const [id,name,options]of [['weight','WEIGHT',[['400','Regular'],['700','Bold']]],['slant','STYLE',[['normal','Normal'],['italic','Italic']]],['caps','CAPTION SHAPE',[['normal','Normal'],['small-caps','Small caps']]]]){const label=document.createElement('label');label.textContent=name;const field=document.createElement('select');field.id='writing-'+id;options.forEach(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;field.append(option);});label.append(field);$('#writing-dialog .writing-controls').append(label);}
  function collect(){if(!active)return;const style={font:$('#writing-font').value,color:$('#writing-color').value,align:$('#writing-align').value,weight:$('#writing-weight').value,slant:$('#writing-slant').value,caps:$('#writing-caps').value};for(const [prop,id]of Object.entries(fields)){const val=Number($('#writing-'+id).value);if(Number.isFinite(val))style[prop]=val;}payload.blocks[active.id]={html:cleanHTML(canvas.innerHTML),style};}
  function choose(id){
    if(active)collect();active=blocks.find(b=>b.id===id)||blocks[0];select.value=active.id;
    const saved=payload.blocks[active.id],st=getComputedStyle(active.el);
    canvas.innerHTML=cleanHTML(saved?.html||(home&&active.id==='intro'?window.SUY_NOTEBOOK_TEXT?.():null)||active.el.innerHTML);
    const rgb=st.color.match(/\d+/g);const color=rgb?'#'+rgb.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join(''):'#333333';
    const style=saved?.style||{};$('#writing-font').value=style.font||(cat?'caption':/courier|mono/i.test(st.fontFamily)?'mono':'sans');$('#writing-color').value=style.color||color;$('#writing-align').value=style.align||st.textAlign||'left';
    $('#writing-weight').value=style.weight||(Number(st.fontWeight)>=600?'700':'400');$('#writing-slant').value=style.slant||st.fontStyle;$('#writing-caps').value=style.caps||(st.fontVariant.includes('small-caps')?'small-caps':'normal');
    const defaults={'font-size':parseFloat(st.fontSize),'line-height':parseFloat(st.lineHeight)/parseFloat(st.fontSize)||1.25,'letter-spacing':parseFloat(st.letterSpacing)||0,width:100,'margin-top':parseFloat(st.marginTop)||0,'margin-bottom':parseFloat(st.marginBottom)||0};
    for(const [prop,f]of Object.entries(fields))$('#writing-'+f).value=style[prop]??defaults[prop];preview();
    if(cat){if(dialog.open)collectLayout();layoutSection=active.el.closest('.umi-green')?'second':'first';showLayout();}
  }
  function preview(){canvas.style.fontFamily=fonts[$('#writing-font').value];canvas.style.fontSize=$('#writing-size').value+'px';canvas.style.lineHeight=$('#writing-leading').value;canvas.style.letterSpacing=$('#writing-spacing').value+'px';canvas.style.color=$('#writing-color').value;canvas.style.textAlign=$('#writing-align').value;canvas.style.fontWeight=$('#writing-weight').value;canvas.style.fontStyle=$('#writing-slant').value;canvas.style.fontVariant=$('#writing-caps').value;}
  async function open(id){if(!ready||!await window.SUY_ADMIN?.isAdmin())return;draftBackup=JSON.stringify(payload);active=null;dirty=false;choose(id);status.textContent='';dialog.showModal();canvas.focus();}
  let draftBackup='';
  function cancel(){payload=JSON.parse(draftBackup||'{"blocks":{}}');active=null;dialog.close();}
  $('#writing-close').onclick=cancel;$('#writing-cancel').onclick=cancel;dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});
  select.onchange=()=>choose(select.value);canvas.oninput=()=>{dirty=true;};
  $('#writing-dialog .writing-controls').oninput=()=>{dirty=true;preview();};
  document.querySelectorAll('[data-command]').forEach(b=>{b.onmousedown=e=>e.preventDefault();b.onclick=()=>{canvas.focus();document.execCommand(b.dataset.command,false,null);dirty=true;};});
  canvas.addEventListener('paste',e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));dirty=true;});
  $('#writing-save').onclick=async e=>{
    const button=e.currentTarget;button.disabled=true;
    try{if(!ready||!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');collect();collectLayout();status.textContent='Saving…';const current=await window.SUY_ADMIN.loadContent(key)||{};await window.SUY_ADMIN.saveContent(key,{...current,...payload});blocks.forEach(b=>apply(b.id));applyLayouts();draftBackup=JSON.stringify(payload);dirty=false;status.textContent='Saved';document.querySelector('.writing-tools span').textContent='Saved';dialog.close();}catch(err){status.textContent=err.message;}finally{button.disabled=false;}
  };
  const tools=document.createElement('div');tools.className='writing-tools';tools.setAttribute('data-admin-only','');tools.hidden=true;const button=document.createElement('button');button.type='button';button.textContent='EDIT TEXT & LAYOUT';button.onclick=()=>open(blocks[0].id);const tip=document.createElement('span');tip.textContent='Double-click text to edit';tools.append(button,tip);(cat?document.querySelector('.umi-footer'):document.body).append(tools);
  blocks.forEach(b=>b.el.addEventListener('dblclick',e=>{if(!window.SUY_IS_ADMIN)return;e.preventDefault();e.stopImmediatePropagation();open(b.id);},true));
  if(home)$('#notebook-note-edit').onclick=()=>open('intro');
  document.addEventListener('suyoon-admin-state',e=>{tools.hidden=!e.detail?.admin;});
  window.SUY_WRITING={has:id=>!!payload.blocks?.[id],apply,open};
  (async()=>{try{if(window.SUY_SITE_READY)await window.SUY_SITE_READY;if(home&&window.SUY_NOTEBOOK_READY)await window.SUY_NOTEBOOK_READY;if(cat&&window.SUY_UMI_READY)await window.SUY_UMI_READY;const saved=await window.SUY_ADMIN.loadContent(key);payload=saved&&typeof saved==='object'?{...saved,blocks:saved.blocks||{}}:{blocks:{}};blocks.forEach(b=>apply(b.id));applyLayouts();ready=true;tools.hidden=!window.SUY_IS_ADMIN;}catch(err){tip.textContent='Could not load saved writing. Refresh before editing.';console.warn('Writing editor unavailable',err);}})();
})();
