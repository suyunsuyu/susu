import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const mount = document.querySelector('#room3d-canvas');
if (!mount) throw new Error('Room canvas is missing.');

const mobile = matchMedia('(max-width: 720px)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfaf3e7);
scene.fog = new THREE.Fog(0xfaf3e7, 16, 26);

const camera = new THREE.OrthographicCamera(-7, 7, 6, -6, .1, 60);
camera.position.set(9.5, 8.2, 11.5);
camera.lookAt(0, 1, 0);
camera.zoom = mobile ? .82 : 1;

const renderer = new THREE.WebGLRenderer({ antialias:!mobile, alpha:false, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.35 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
mount.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.enableDamping = true;
controls.dampingFactor = .08;
controls.enablePan = false;
controls.enableZoom = false;
controls.screenSpacePanning = true;
controls.target.set(0, 1, 0);

const C = {
  wall:0xeee3d2, wallSide:0xd8c1a6, floor:0x6c4d3e, floorLine:0x7b756f,
  floorWoodA:0x88634b, floorWoodB:0x765340, floorWoodC:0x997254, floorSeam:0x5a3d31,
  ink:0x332b27, dark:0x4b3930, mid:0x9c856f, light:0xf4eadc,
  paper:0xf9f3e9, fabric:0xb9aa91, wood:0x8b6043, metal:0x665950,
  glass:0x8cb9bb, plant:0x6e8b5f, warm:0xe0b56c,
  sage:0xa9b39f, peach:0xd38e6e, sky:0x7198a0, rug:0xc7b496
};
const material = (color, roughness=.8, metalness=.03) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const makeWoodTexture = () => {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const context=canvas.getContext('2d');
  const gradient=context.createLinearGradient(0,0,0,128);gradient.addColorStop(0,'#746b64');gradient.addColorStop(.5,'#665e58');gradient.addColorStop(1,'#786f68');context.fillStyle=gradient;context.fillRect(0,0,512,128);
  for(let i=0;i<34;i++){
    const y=4+i*3.8;context.beginPath();
    for(let x=0;x<=512;x+=8){const wave=Math.sin(x*.035+i*.63)*2.2+Math.sin(x*.008+i)*1.3;const yy=y+wave; if(x===0)context.moveTo(x,yy);else context.lineTo(x,yy)}
    context.strokeStyle=i%4===0?'rgba(238,232,224,.13)':'rgba(30,27,25,.12)';context.lineWidth=i%5===0?1.6:.8;context.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.25,1);return texture;
};
const woodTexture=makeWoodTexture();
const texturedMaterial=(color,roughness=.96)=>new THREE.MeshStandardMaterial({color,map:woodTexture,roughness,metalness:.02});
const mats = {
  wall:material(C.wall,.95), wallSide:material(C.wallSide,.95), floor:material(C.floor,.9),
  floorWoodA:texturedMaterial(C.floorWoodA), floorWoodB:texturedMaterial(C.floorWoodB), floorWoodC:texturedMaterial(C.floorWoodC), floorSeam:material(C.floorSeam,.96),
  ink:material(C.ink,.78), dark:material(C.dark,.85), mid:material(C.mid,.88),
  light:material(C.light,.92), paper:material(C.paper,.98), fabric:material(C.fabric,1),
  sage:material(C.sage,.96), peach:material(C.peach,.9), sky:material(C.sky,.64), rug:material(C.rug,1),
  wood:texturedMaterial(C.wood,.9), metal:material(C.metal,.4,.42), glass:material(C.glass,.22,.08),
  plant:material(C.plant,.95), warm:material(C.warm,.9)
};

const shadow = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
const addBox = (parent, size, position, mat=mats.light, rotation=[0,0,0]) => {
  const mesh = shadow(new THREE.Mesh(new THREE.BoxGeometry(...size), mat));
  mesh.position.set(...position); mesh.rotation.set(...rotation); parent.add(mesh); return mesh;
};
const addCylinder = (parent, radiusTop, radiusBottom, height, position, mat=mats.light, segments=18, rotation=[0,0,0]) => {
  const mesh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,segments),mat));
  mesh.position.set(...position); mesh.rotation.set(...rotation); parent.add(mesh); return mesh;
};
const addSphere = (parent, radius, position, mat=mats.light, scale=[1,1,1]) => {
  const mesh = shadow(new THREE.Mesh(new THREE.SphereGeometry(radius,18,12),mat));
  mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
};
const addPlane = (parent, size, position, mat=mats.paper, rotation=[0,0,0]) => {
  const mesh = shadow(new THREE.Mesh(new THREE.PlaneGeometry(...size),mat));
  mesh.position.set(...position); mesh.rotation.set(...rotation); parent.add(mesh); return mesh;
};
const group = (position=[0,0,0]) => { const g=new THREE.Group();g.position.set(...position);scene.add(g);return g; };

const interactives = [];
const focusPoints = new Map();
const labels = {
  camera:'PHOTOGRAPHS', tv:'MY WORKS', cat:'MY CAT', calendar:'MEMORIES', music:'MY MUSIC',
  lamp:'LIGHT', flowers:'FLOWERS', books:'MY BOOKS', trophy:'EDUCATION', diary:'ABOUT ME',
  artwork:'MY ART', telephone:'GUESTBOOK'
};
const register = (root,key,focus) => {
  root.userData.roomKey=key;root.userData.baseScale=root.scale.clone();
  root.traverse(o=>{if(o.isMesh){o.userData.roomRoot=root;interactives.push(o)}});
  focusPoints.set(key,new THREE.Vector3(...focus));return root;
};

// Architectural shell
const shell = group();
addBox(shell,[10,.16,8],[0,-.08,0],mats.floorWoodB);
addBox(shell,[10,5,.16],[0,2.5,-4],mats.wall);
addBox(shell,[.16,5,8],[-5,2.5,0],mats.wallSide);
// Long wood planks keep the floor warm and tactile without the old square grid.
const floorBoardMats=[mats.floorWoodA,mats.floorWoodB,mats.floorWoodC,mats.floorWoodB,mats.floorWoodA,mats.floorWoodC,mats.floorWoodB,mats.floorWoodA];
for(let i=0;i<8;i++){
  const z=-3.5+i*.99;
  addBox(shell,[9.76,.038,.965],[0,.018,z],floorBoardMats[i]);
  if(i<7)addBox(shell,[9.72,.009,.018],[0,.044,z+.485],mats.floorSeam);
}

// Window and quiet exterior
const windowGroup=group([-4.9,2.65,-1]);
addBox(windowGroup,[.08,2.15,2.55],[0,0,0],mats.ink);
const windowPane=addPlane(windowGroup,[2.25,1.84],[.05,0,0],material(0x969a98,.3),[0,Math.PI/2,0]);
addBox(windowGroup,[.08,.06,2.3],[.08,0,0],mats.ink);
addBox(windowGroup,[.08,1.9,.06],[.08,0,0],mats.ink);
const moon=addSphere(windowGroup,.21,[.1,.45,.62],mats.paper);
addBox(windowGroup,[.1,.07,2.85],[.13,1.18,0],mats.wood);
addBox(windowGroup,[.11,2.05,.16],[.13,.05,-1.33],mats.fabric);
addBox(windowGroup,[.11,2.05,.16],[.13,.05,1.33],mats.fabric);

// Central sofa, cushions, rug and table
const rug=group([0,.03,.75]); addBox(rug,[4.35,.04,3.25],[0,0,0],mats.rug);
addBox(rug,[4.06,.015,.025],[0,.03,-1.51],mats.mid);addBox(rug,[4.06,.015,.025],[0,.03,1.51],mats.mid);
addBox(rug,[.025,.015,3.02],[-2.03,.03,0],mats.mid);addBox(rug,[.025,.015,3.02],[2.03,.03,0],mats.mid);
const sofa=group([.15,0,-1.65]);
addBox(sofa,[3.65,.48,1.18],[0,.48,0],mats.fabric);
addBox(sofa,[3.65,1.25,.28],[0,1.18,-.47],mats.fabric,[.08,0,0]);
addBox(sofa,[.3,.75,1.25],[-1.7,.72,0],mats.fabric);addBox(sofa,[.3,.75,1.25],[1.7,.72,0],mats.fabric);
addBox(sofa,[1.25,.48,.18],[-.75,1.02,-.24],mats.sage,[.05,.08,-.03]);
addBox(sofa,[1.05,.43,.18],[.67,1.03,-.24],mats.peach,[-.03,-.1,.04]);
addBox(sofa,[1.18,.08,.82],[.2,.78,.05],mats.paper,[0,.08,.03]);
addBox(sofa,[3.05,.025,.025],[0,.74,.59],mats.mid);
[-1.15,-.38,.38,1.15].forEach(x=>addSphere(sofa,.035,[x,.74,.6],mats.dark));

const table=group([0,0,1.12]);
addBox(table,[2.25,.13,1.24],[0,.75,0],mats.wood);
[[-.9,.38,-.43],[.9,.38,-.43],[-.9,.38,.43],[.9,.38,.43]].forEach(p=>addBox(table,[.1,.75,.1],p,mats.dark));
addCylinder(table,.13,.11,.22,[-.48,.92,.18],mats.paper,18);
addBox(table,[.62,.035,.42],[.4,.84,.05],mats.paper,[0,.18,0]);
addBox(table,[.56,.04,.37],[.48,.875,.12],mats.mid,[0,.18,0]);
const planeDecor=addBox(table,[.42,.025,.34],[-.35,.84,-.28],mats.paper,[0,-.35,0]);
addBox(table,[2.05,.05,.055],[0,.69,-.61],mats.dark);
addBox(table,[2.05,.05,.055],[0,.69,.61],mats.dark);

// Static cat
const cat=group([1.55,.18,1.76]);
addSphere(cat,.38,[0,.35,0],mats.warm,[1,.82,1.25]);
addSphere(cat,.3,[0,.75,-.05],mats.warm,[1,1,.92]);
const earGeo=new THREE.ConeGeometry(.14,.32,3);
[-.16,.16].forEach(x=>{const e=shadow(new THREE.Mesh(earGeo,mats.warm));e.position.set(x,1.04,-.04);e.rotation.z=x<0?.12:-.12;cat.add(e)});
addSphere(cat,.035,[-.1,.79,-.28],mats.ink);addSphere(cat,.035,[.1,.79,-.28],mats.ink);
const tail=addCylinder(cat,.065,.09,1.05,[.43,.32,.18],mats.warm,14,[0,0,-1.05]);
register(cat,'cat',[1.55,.65,1.75]);

// Left cabinet and camera
const leftCab=group([-3.7,0,-1.35]);
addBox(leftCab,[2.15,.86,.72],[0,.43,0],mats.wood);addBox(leftCab,[.04,.65,.66],[0,.43,.04],mats.dark);
for(let x of[-.78,.78])addBox(leftCab,[.08,.22,.08],[x,.05,0],mats.dark);
for(let x of[-.78,.78])addCylinder(leftCab,.035,.035,.16,[x,.49,.38],mats.metal,12,[Math.PI/2,0,0]);
const cam=group([-3.75,.94,-1.34]);
addBox(cam,[.72,.42,.36],[0,.18,0],mats.dark);addBox(cam,[.25,.13,.3],[-.18,.45,0],mats.dark);
addCylinder(cam,.18,.18,.18,[0,.2,.25],mats.glass,20,[Math.PI/2,0,0]);
addCylinder(cam,.09,.09,.2,[0,.2,.32],mats.ink,20,[Math.PI/2,0,0]);
addCylinder(cam,.215,.215,.025,[0,.2,.355],mats.mid,24,[Math.PI/2,0,0]);
addBox(cam,[.06,.025,.18],[.31,.18,0],mats.mid,[0,.12,0]);
register(cam,'camera',[-3.75,1.2,-1.35]);

// Calendar on left wall
const calendar=group([-4.88,2.05,.72]);
addBox(calendar,[.05,1.25,1],[0,0,0],mats.paper);
for(let i=-.34;i<=.34;i+=.34) addBox(calendar,[.065,.035,.12],[.04,.62,i],mats.ink,[0,0,Math.PI/2]);
for(let y=-.32;y<=.28;y+=.3)for(let z=-.3;z<=.3;z+=.3)addBox(calendar,[.065,.1,.1],[.045,y,z],(y<0&&z===0)?mats.ink:mats.mid);
register(calendar,'calendar',[-4.75,2.05,.72]);

// Plant and flower pot
const flowers=group([-3.65,0,1.65]);
addCylinder(flowers,.34,.25,.65,[0,.34,0],mats.dark,18);
for(let i=0;i<7;i++){
  const a=i/7*Math.PI*2;addCylinder(flowers,.025,.025,.82,[Math.cos(a)*.12,.93,Math.sin(a)*.12],mats.plant,8,[Math.sin(a)*.28,0,Math.cos(a)*.28]);
  addSphere(flowers,.23,[Math.cos(a)*.35,1.2+Math.sin(a*2)*.08,Math.sin(a)*.35],mats.plant,[.62,1,.35]);
}
addSphere(flowers,.1,[0,1.42,0],mats.paper);
register(flowers,'flowers',[-3.65,.95,1.65]);

// TV and cabinet
const tvCab=group([2.75,0,-3.25]);
addBox(tvCab,[3.25,.82,.78],[0,.42,0],mats.wood);addBox(tvCab,[.04,.58,.7],[0,.43,.04],mats.dark);
for(let x of[-1.25,1.25])addBox(tvCab,[.09,.2,.09],[x,.06,.05],mats.dark);
for(let x of[-1.05,-.35,.35,1.05])addCylinder(tvCab,.03,.03,.14,[x,.48,.4],mats.metal,10,[Math.PI/2,0,0]);
const tv=group([2.72,2.25,-3.82]);
addBox(tv,[2.55,1.46,.18],[0,0,0],mats.ink);const tvScreen=addBox(tv,[2.3,1.21,.045],[0,0,.115],material(C.sky,.36));
addBox(tv,[.08,.46,.08],[0,-.94,0],mats.dark);addBox(tv,[.86,.06,.34],[0,-1.15,.08],mats.dark);
addBox(tv,[1.85,.025,.025],[0,-.48,.145],mats.light);
addBox(tv,[.04,.42,.025],[-.92,.02,.145],mats.light);addBox(tv,[.04,.42,.025],[.92,.02,.145],mats.light);
register(tv,'tv',[2.72,2.25,-3.65]);

// Record player and headphones
const music=group([3.65,.9,-1.45]);
addBox(music,[1.4,.18,1.05],[0,0,0],mats.dark);
const vinyl=addCylinder(music,.42,.42,.025,[-.2,.12,0],mats.ink,32);
addCylinder(music,.06,.06,.035,[-.2,.145,0],mats.paper,18);
addBox(music,[.055,.05,.58],[.36,.19,.06],mats.metal,[0,.38,0]);
register(music,'music',[3.65,1.15,-1.45]);
const headphones=group([4.2,.92,-2.65]);addCylinder(headphones,.33,.33,.05,[0,0,0],mats.ink,24,[Math.PI/2,0,0]);

// Bookshelf with irregular books
const books=group([4.17,0,.45]);
addBox(books,[1.35,2.45,.42],[0,1.22,0],mats.wood);
addBox(books,[1.12,2.12,.5],[0,1.25,.08],mats.wallSide);
for(let y of[.52,1.18,1.84])addBox(books,[1.25,.09,.56],[0,y,.08],mats.wood);
for(let shelf=0;shelf<3;shelf++)for(let i=0;i<5;i++){
  const h=.32+((i+shelf)%3)*.06;addBox(books,[.11,h,.39],[-.43+i*.2,.68+shelf*.66+(h-.34)/2,.08],[mats.ink,mats.mid,mats.paper,mats.dark][(i+shelf)%4],[0,0,(i===4?-.13:0)]);
}
register(books,'books',[4.05,1.35,.45]);

// Trophy on central cabinet
const trophy=group([1.2,.95,-3.28]);
addCylinder(trophy,.26,.18,.42,[0,.22,0],mats.metal,18);addCylinder(trophy,.06,.06,.3,[0,-.12,0],mats.metal,12);
addBox(trophy,[.5,.1,.32],[0,-.3,0],mats.dark);
addCylinder(trophy,.05,.05,.55,[-.29,.2,0],mats.metal,8,[0,0,-.65]);addCylinder(trophy,.05,.05,.55,[.29,.2,0],mats.metal,8,[0,0,.65]);
register(trophy,'trophy',[1.2,1.25,-3.1]);

// Diary on coffee table
const diary=group([.47,.84,1.24]);
addBox(diary,[.74,.055,.52],[0,0,0],mats.ink,[0,.2,0]);addBox(diary,[.65,.018,.44],[.02,.04,0],mats.paper,[0,.2,0]);
register(diary,'diary',[.45,1.12,1.24]);

// Pendant lamp
const lamp=group([0,4.1,-.1]);
addCylinder(lamp,.025,.025,1.65,[0,.5,0],mats.ink,8);
addCylinder(lamp,.15,.6,.52,[0,-.48,0],mats.metal,24);
const bulb=addSphere(lamp,.17,[0,-.7,0],mats.paper);
const pendantLight=new THREE.PointLight(0xe1d4c4,1.3,6,2);pendantLight.position.set(0,-.67,0);pendantLight.castShadow=true;pendantLight.shadow.mapSize.set(mobile?256:512,mobile?256:512);lamp.add(pendantLight);
register(lamp,'lamp',[0,3.25,-.1]);

// A second, low table lamp makes the WARM setting feel like a real room rather
// than a color filter. Both lamps share the same click cycle.
const warmLamp=group([2.05,.84,-2.68]);
addCylinder(warmLamp,.23,.23,.07,[0,.04,0],mats.metal,18);
addCylinder(warmLamp,.035,.035,.4,[0,.27,0],mats.ink,10);
addCylinder(warmLamp,.13,.31,.26,[0,.57,0],mats.paper,20);
const warmLampBulb=addSphere(warmLamp,.09,[0,.48,0],mats.paper);
register(warmLamp,'lamp',[2.05,1.32,-2.68]);

// Artwork and frames
const artwork=group([-.65,2.7,-3.84]);
addBox(artwork,[1.65,1.22,.09],[0,0,0],mats.ink);addBox(artwork,[1.45,1.02,.05],[0,0,.07],mats.paper);
addBox(artwork,[.82,.04,.03],[.05,.1,.12],mats.mid,[0,0,.4]);addSphere(artwork,.2,[-.28,-.15,.12],mats.dark,[1.5,.6,1]);
register(artwork,'artwork',[-.65,2.7,-3.55]);

// Wall message board / guestbook. The board is the clickable object visitors
// can use to reach the guestbook without adding another floating label.
const messageBoard=group([-2.35,2.72,-3.88]);
addBox(messageBoard,[1.55,1.15,.08],[0,0,0],mats.dark);
addBox(messageBoard,[1.38,.98,.035],[0,0,.06],mats.paper);
addBox(messageBoard,[.52,.32,.025],[-.36,.22,.09],mats.light,[0,0,.05]);
addBox(messageBoard,[.42,.25,.025],[.26,-.18,.09],mats.mid,[0,0,-.08]);
[-.55,.55].forEach(x=>addSphere(messageBoard,.045,[x,.45,.1],mats.ink));
register(messageBoard,'telephone',[-2.35,2.72,-3.5]);

// Keep the floor plan quiet: the main interactive objects have room to read,
// with one simple chair grounding the coffee table instead of many small props.
const chair=group([-1.9,0,1.45]);addBox(chair,[.72,.1,.72],[0,.72,0],mats.wood);for(let x of[-.27,.27])for(let z of[-.27,.27])addBox(chair,[.07,.72,.07],[x,.36,z],mats.dark);addBox(chair,[.72,.8,.08],[0,1.1,.3],mats.wood);

// Lighting
const hemi=new THREE.HemisphereLight(0xfff7e9,0x654839,2.4);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d7,3.5);sun.position.set(7,11,8);sun.castShadow=true;sun.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;scene.add(sun);
const ambient=new THREE.AmbientLight(0xffffff,.35);scene.add(ambient);
const windowLight=new THREE.PointLight(0xc9ced0,.3,8);windowLight.position.set(-4.2,2.8,-.8);scene.add(windowLight);
const warmFill=new THREE.PointLight(0xffc18f,0,8,2);warmFill.position.set(.8,2.1,1.5);warmFill.castShadow=true;warmFill.shadow.mapSize.set(mobile?256:512,mobile?256:512);scene.add(warmFill);
const lighting={mode:0,names:['DAY','WARM','NIGHT']};
const lightTargets=[
  {hemi:2.4,sun:3.5,pendant:.2,ambient:.35,window:.3,warmFill:.02,exposure:1.05,bg:0xfaf3e7,pane:0x8cb9bb},
  {hemi:1.25,sun:1.2,pendant:3.1,ambient:.28,window:.2,warmFill:1.55,exposure:.93,bg:0xf3dfc1,pane:0x779999},
  {hemi:.28,sun:.12,pendant:1.45,ambient:.16,window:1.35,warmFill:.25,exposure:.64,bg:0x51443f,pane:0x314b4b}
];
let currentLight={...lightTargets[0]};let wantedLight={...lightTargets[0]};
const lightLabel=document.querySelector('#room-light-label'),toast=document.querySelector('#room3d-toast');let toastTimer;
let lightAudioContext=null;
function playLightSound(mode){
  try{
    const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextCtor)return;
    lightAudioContext=lightAudioContext||new AudioContextCtor();
    if(lightAudioContext.state==='suspended')lightAudioContext.resume();
    const now=lightAudioContext.currentTime;
    const notes=mode==='WARM'?[523.25,659.25]:mode==='NIGHT'?[392,329.63]:[659.25,783.99];
    notes.forEach((frequency,index)=>{
      const oscillator=lightAudioContext.createOscillator(),gain=lightAudioContext.createGain();
      oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,now+index*.06);
      gain.gain.setValueAtTime(.0001,now+index*.06);gain.gain.exponentialRampToValueAtTime(.045,now+index*.06+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+index*.06+.28);
      oscillator.connect(gain).connect(lightAudioContext.destination);oscillator.start(now+index*.06);oscillator.stop(now+index*.06+.3);
    });
  }catch{}
}
const setLightMode=index=>{
  lighting.mode=(index+3)%3;wantedLight={...lightTargets[lighting.mode]};
  const mode=lighting.names[lighting.mode];if(lightLabel)lightLabel.textContent=mode;playLightSound(mode);
  if(toast){toast.textContent=`ROOM LIGHT · ${mode}`;toast.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),1400)}
  document.dispatchEvent(new CustomEvent('room-light-change',{detail:{mode}}))
};

const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let hovered=null;let down={x:0,y:0};
const label=document.querySelector('#room3d-object-label');
const rootFromHit=hit=>hit?.object?.userData?.roomRoot||null;
const setHover=root=>{
  if(hovered===root)return;
  if(hovered){hovered.scale.copy(hovered.userData.baseScale);hovered.traverse(o=>{if(o.isMesh&&o.material?.emissive)o.material.emissive.setHex(0x000000)})}
  hovered=root;
  if(root){root.scale.copy(root.userData.baseScale).multiplyScalar(1.012);root.traverse(o=>{if(o.isMesh&&o.material?.emissive)o.material.emissive.setHex(0x111111)});renderer.domElement.style.cursor='pointer';if(label){label.textContent=labels[root.userData.roomKey]||'';label.hidden=false}}
  else{renderer.domElement.style.cursor='default';if(label)label.hidden=true}
};
const cast=event=>{const rect=renderer.domElement.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);return rootFromHit(raycaster.intersectObjects(interactives,false)[0])};
renderer.domElement.addEventListener('pointermove',event=>{const root=cast(event);setHover(root);if(root&&label){const r=mount.getBoundingClientRect();label.style.left=`${event.clientX-r.left+12}px`;label.style.top=`${event.clientY-r.top+12}px`}});
renderer.domElement.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY}});
renderer.domElement.addEventListener('pointerup',event=>{
  if(Math.hypot(event.clientX-down.x,event.clientY-down.y)>8)return;
  const root=cast(event);if(!root)return;const key=root.userData.roomKey;
  if(key==='lamp'){setLightMode(lighting.mode+1);return}
  if(key==='telephone'){location.href='guestbook.html';return}
  if(key==='cat'){location.href='tools.html';return}
  focusObject(key);document.dispatchEvent(new CustomEvent('room-object-select',{detail:{key}}));
});

// The room is a fixed illustration: clicking furniture opens its content but
// never pans or zooms the house away from the center.
const focusObject=()=>{};
const resetCamera=()=>{};
document.addEventListener('room-content-closed',resetCamera);
document.addEventListener('room-record-playing',event=>{vinyl.userData.playing=!!event.detail?.playing});

const resize=()=>{
  const w=mount.clientWidth||innerWidth,h=mount.clientHeight||innerHeight,aspect=w/h;
  const frustumH=mobile?11.7:9.6;camera.left=-frustumH*aspect/2;camera.right=frustumH*aspect/2;camera.top=frustumH/2;camera.bottom=-frustumH/2;camera.updateProjectionMatrix();renderer.setSize(w,h,false)
};
new ResizeObserver(resize).observe(mount);resize();

// The room is an intimate centerpiece rather than a full-screen wall. Keep
// its center anchored while leaving generous quiet space around the scene.
scene.scale.setScalar(mobile ? .56 : .48);

const clock3d=new THREE.Clock();
const animate=()=>{
  const dt=Math.min(clock3d.getDelta(),.05);
  controls.update();
  for(const k of['hemi','sun','pendant','ambient','window','warmFill','exposure'])currentLight[k]=THREE.MathUtils.lerp(currentLight[k],wantedLight[k],Math.min(1,dt*2.2));
  hemi.intensity=currentLight.hemi;sun.intensity=currentLight.sun;pendantLight.intensity=currentLight.pendant;ambient.intensity=currentLight.ambient;windowLight.intensity=currentLight.window;warmFill.intensity=currentLight.warmFill;renderer.toneMappingExposure=currentLight.exposure;
  scene.background.lerp(new THREE.Color(wantedLight.bg),Math.min(1,dt*1.8));windowPane.material.color.lerp(new THREE.Color(wantedLight.pane),Math.min(1,dt*1.8));
  if(vinyl.userData.playing&&!reducedMotion)vinyl.rotation.y+=dt*.45;
  renderer.render(scene,camera);requestAnimationFrame(animate)
};
animate();

requestAnimationFrame(()=>requestAnimationFrame(()=>{document.querySelector('#room3d-loading')?.classList.add('is-ready');document.body.classList.add('room3d-ready')}));
