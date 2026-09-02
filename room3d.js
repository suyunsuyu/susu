import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const mount = document.querySelector('#room3d-canvas');
if (!mount) throw new Error('Room canvas is missing.');

const mobile = matchMedia('(max-width: 720px)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f3ef);
scene.fog = new THREE.Fog(0xf4f3ef, 16, 26);

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
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minZoom = mobile ? .72 : .88;
controls.maxZoom = mobile ? 1.28 : 1.18;
controls.target.set(0, 1, 0);
controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
controls.touches.ONE = THREE.TOUCH.PAN;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

const C = {
  wall:0xe5e3de, wallSide:0xd4d1cb, floor:0x625d58, floorLine:0x7b756f,
  ink:0x242424, dark:0x3b3937, mid:0x8e8a85, light:0xc8c5bf,
  paper:0xf4f2ed, fabric:0xaaa7a1, wood:0x81776e, metal:0x565656,
  glass:0xbec1be, plant:0x777b72, warm:0xb0a18e
};
const material = (color, roughness=.8, metalness=.03) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const mats = {
  wall:material(C.wall,.95), wallSide:material(C.wallSide,.95), floor:material(C.floor,.9),
  ink:material(C.ink,.78), dark:material(C.dark,.85), mid:material(C.mid,.88),
  light:material(C.light,.92), paper:material(C.paper,.98), fabric:material(C.fabric,1),
  wood:material(C.wood,.88), metal:material(C.metal,.4,.42), glass:material(C.glass,.22,.08),
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
addBox(shell,[10,.16,8],[0,-.08,0],mats.floor);
addBox(shell,[10,5,.16],[0,2.5,-4],mats.wall);
addBox(shell,[.16,5,8],[-5,2.5,0],mats.wallSide);
for(let x=-4.7;x<5;x+=.55)addBox(shell,[.025,.018,7.7],[x,.015,0],mats.floorLine);
for(let z=-3.7;z<4;z+=.9)addBox(shell,[9.7,.02,.025],[0,.018,z],mats.floorLine);

// Window and quiet exterior
const windowGroup=group([-4.9,2.65,-1]);
addBox(windowGroup,[.08,2.15,2.55],[0,0,0],mats.ink);
const windowPane=addPlane(windowGroup,[2.25,1.84],[.05,0,0],material(0x969a98,.3),[0,Math.PI/2,0]);
addBox(windowGroup,[.08,.06,2.3],[.08,0,0],mats.ink);
addBox(windowGroup,[.08,1.9,.06],[.08,0,0],mats.ink);
const moon=addSphere(windowGroup,.21,[.1,.45,.62],mats.paper);

// Central sofa, cushions, rug and table
const rug=group([0,.03,.75]); addBox(rug,[4.35,.04,3.25],[0,0,0],mats.light);
for(let i=-1.7;i<=1.7;i+=.42)addBox(rug,[.018,.015,3.05],[i,.03,0],mats.mid);
const sofa=group([.15,0,-1.65]);
addBox(sofa,[3.65,.48,1.18],[0,.48,0],mats.fabric);
addBox(sofa,[3.65,1.25,.28],[0,1.18,-.47],mats.fabric,[.08,0,0]);
addBox(sofa,[.3,.75,1.25],[-1.7,.72,0],mats.fabric);addBox(sofa,[.3,.75,1.25],[1.7,.72,0],mats.fabric);
addBox(sofa,[1.25,.48,.18],[-.75,1.02,-.24],mats.light,[.05,.08,-.03]);
addBox(sofa,[1.05,.43,.18],[.67,1.03,-.24],mats.mid,[-.03,-.1,.04]);
addBox(sofa,[1.18,.08,.82],[.2,.78,.05],mats.paper,[0,.08,.03]);

const table=group([0,0,1.12]);
addBox(table,[2.25,.13,1.24],[0,.75,0],mats.wood);
[[-.9,.38,-.43],[.9,.38,-.43],[-.9,.38,.43],[.9,.38,.43]].forEach(p=>addBox(table,[.1,.75,.1],p,mats.dark));
addCylinder(table,.13,.11,.22,[-.48,.92,.18],mats.paper,18);
addBox(table,[.62,.035,.42],[.4,.84,.05],mats.paper,[0,.18,0]);
addBox(table,[.56,.04,.37],[.48,.875,.12],mats.mid,[0,.18,0]);
const planeDecor=addBox(table,[.42,.025,.34],[-.35,.84,-.28],mats.paper,[0,-.35,0]);

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
const cam=group([-3.75,.94,-1.34]);
addBox(cam,[.72,.42,.36],[0,.18,0],mats.dark);addBox(cam,[.25,.13,.3],[-.18,.45,0],mats.dark);
addCylinder(cam,.18,.18,.18,[0,.2,.25],mats.glass,20,[Math.PI/2,0,0]);
addCylinder(cam,.09,.09,.2,[0,.2,.32],mats.ink,20,[Math.PI/2,0,0]);
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
const tv=group([2.72,2.25,-3.82]);
addBox(tv,[2.55,1.46,.18],[0,0,0],mats.ink);const tvScreen=addBox(tv,[2.3,1.21,.045],[0,0,.115],material(0x555754,.36));
addBox(tv,[.08,.46,.08],[0,-.94,0],mats.dark);addBox(tv,[.86,.06,.34],[0,-1.15,.08],mats.dark);
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

// Artwork and frames
const artwork=group([-.65,2.7,-3.84]);
addBox(artwork,[1.65,1.22,.09],[0,0,0],mats.ink);addBox(artwork,[1.45,1.02,.05],[0,0,.07],mats.paper);
addBox(artwork,[.82,.04,.03],[.05,.1,.12],mats.mid,[0,0,.4]);addSphere(artwork,.2,[-.28,-.15,.12],mats.dark,[1.5,.6,1]);
register(artwork,'artwork',[-.65,2.7,-3.55]);
const frame1=group([-3.05,3.25,-3.86]);addBox(frame1,[.82,1.02,.06],[0,0,0],mats.ink);addBox(frame1,[.67,.86,.04],[0,0,.05],mats.light);
const frame2=group([-2.05,3.48,-3.86]);addBox(frame2,[.58,.74,.06],[0,0,0],mats.ink);addBox(frame2,[.45,.61,.04],[0,0,.05],mats.paper);
const map=group([-4.88,3.5,2.35]);addBox(map,[.05,1.25,1.5],[0,0,0],mats.paper);for(let i=0;i<4;i++)addBox(map,[.06,.025,.75],[.04,-.35+i*.25,-.12+i*.18],mats.mid,[0,0,.2-i*.1]);

// Telephone / guestbook
const sideTable=group([-2.55,0,2.65]);addBox(sideTable,[1.25,.1,.82],[0,.72,0],mats.wood);addBox(sideTable,[.1,.72,.1],[-.48,.36,-.28],mats.dark);addBox(sideTable,[.1,.72,.1],[.48,.36,.28],mats.dark);
const phone=group([-2.55,.79,2.65]);addBox(phone,[.78,.22,.55],[0,.1,0],mats.dark);addBox(phone,[.86,.16,.2],[0,.34,0],mats.ink,[0,0,.05]);addCylinder(phone,.17,.17,.025,[0,.24,.3],mats.paper,18,[Math.PI/2,0,0]);
register(phone,'telephone',[-2.55,1.15,2.65]);

// Additional lived-in objects: chair, slippers, bag, vase, storage box, clock, mirror, cat toy
const chair=group([-1.9,0,1.45]);addBox(chair,[.72,.1,.72],[0,.72,0],mats.wood);for(let x of[-.27,.27])for(let z of[-.27,.27])addBox(chair,[.07,.72,.07],[x,.36,z],mats.dark);addBox(chair,[.72,.8,.08],[0,1.1,.3],mats.wood);
const slippers=group([2.55,.08,2.55]);addSphere(slippers,.22,[-.28,.05,0],mats.paper,[.6,.28,1.35]);addSphere(slippers,.22,[.28,.05,.18],mats.paper,[.6,.28,1.35]);
const bag=group([-4.15,.1,3]);addBox(bag,[.72,.72,.24],[0,.36,0],mats.dark);const handle=new THREE.Mesh(new THREE.TorusGeometry(.24,.035,8,20,Math.PI),mats.dark);handle.position.set(0,.76,0);bag.add(handle);
const vase=group([3.9,.86,-3.28]);addCylinder(vase,.15,.25,.55,[0,.28,0],mats.paper,18);addCylinder(vase,.035,.035,.65,[0,.85,0],mats.plant,8);addSphere(vase,.16,[0,1.18,0],mats.light,[.7,1,.7]);
const box=group([3.55,.12,2.75]);addBox(box,[1.02,.55,.82],[0,.28,0],mats.mid);addBox(box,[1.08,.07,.88],[0,.58,0],mats.dark);
const clock=group([-1.9,3.55,-3.86]);addCylinder(clock,.38,.38,.07,[0,0,0],mats.paper,28,[Math.PI/2,0,0]);addBox(clock,[.025,.28,.025],[0,.08,.08],mats.ink,[0,0,.45]);addBox(clock,[.025,.2,.025],[.06,-.05,.08],mats.ink,[0,0,-.7]);
const mirror=group([-4.88,2.55,3.05]);addBox(mirror,[.06,1.35,.82],[0,0,0],mats.ink);addBox(mirror,[.065,1.18,.67],[.04,0,0],mats.glass);
const catToy=group([1.9,.06,.38]);addSphere(catToy,.12,[0,.1,0],mats.dark);addCylinder(catToy,.02,.02,.65,[0,.44,0],mats.ink,6,[0,0,.4]);
const paperPlane=group([-.5,.86,.82]);addPlane(paperPlane,[.5,.28],[0,0,0],mats.paper,[-Math.PI/2,0,.45]);

// Lighting
const hemi=new THREE.HemisphereLight(0xf5f3ee,0x625d58,2.4);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xf5f1e9,3.5);sun.position.set(7,11,8);sun.castShadow=true;sun.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;scene.add(sun);
const ambient=new THREE.AmbientLight(0xffffff,.35);scene.add(ambient);
const windowLight=new THREE.PointLight(0xc9ced0,.3,8);windowLight.position.set(-4.2,2.8,-.8);scene.add(windowLight);
const lighting={mode:0,names:['DAY','WARM','NIGHT']};
const lightTargets=[
  {hemi:2.4,sun:3.5,pendant:.2,ambient:.35,window:.3,exposure:1.05,bg:0xf4f3ef,pane:0x969a98},
  {hemi:1.25,sun:1.2,pendant:3.1,ambient:.28,window:.2,exposure:.93,bg:0xe8e5df,pane:0x777977},
  {hemi:.28,sun:.12,pendant:1.45,ambient:.16,window:1.35,exposure:.64,bg:0x6e6e6b,pane:0x333638}
];
let currentLight={...lightTargets[0]};let wantedLight={...lightTargets[0]};
const lightLabel=document.querySelector('#room-light-label'),toast=document.querySelector('#room3d-toast');let toastTimer;
const setLightMode=index=>{
  lighting.mode=(index+3)%3;wantedLight={...lightTargets[lighting.mode]};
  const mode=lighting.names[lighting.mode];if(lightLabel)lightLabel.textContent=mode;
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
  if(root){root.scale.copy(root.userData.baseScale).multiplyScalar(1.012);root.traverse(o=>{if(o.isMesh&&o.material?.emissive)o.material.emissive.setHex(0x111111)});renderer.domElement.style.cursor='pointer';label.textContent=labels[root.userData.roomKey]||'';label.hidden=false}
  else{renderer.domElement.style.cursor='grab';label.hidden=true}
};
const cast=event=>{const rect=renderer.domElement.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);return rootFromHit(raycaster.intersectObjects(interactives,false)[0])};
renderer.domElement.addEventListener('pointermove',event=>{const root=cast(event);setHover(root);if(root){const r=mount.getBoundingClientRect();label.style.left=`${event.clientX-r.left+12}px`;label.style.top=`${event.clientY-r.top+12}px`}});
renderer.domElement.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY}});
renderer.domElement.addEventListener('pointerup',event=>{
  if(Math.hypot(event.clientX-down.x,event.clientY-down.y)>8)return;
  const root=cast(event);if(!root)return;const key=root.userData.roomKey;
  if(key==='lamp'){setLightMode(lighting.mode+1);return}
  if(key==='telephone'){location.href='guestbook.html';return}
  focusObject(key);document.dispatchEvent(new CustomEvent('room-object-select',{detail:{key}}));
});

const homeCamera=camera.position.clone(),homeTarget=controls.target.clone();
let cameraGoal=homeCamera.clone(),targetGoal=homeTarget.clone(),focusActive=false,returningHome=false;
const focusObject=key=>{const p=focusPoints.get(key);if(!p)return;focusActive=true;returningHome=false;targetGoal.copy(p);const offset=homeCamera.clone().sub(homeTarget).multiplyScalar(.76);cameraGoal.copy(p).add(offset)};
const resetCamera=()=>{focusActive=true;returningHome=true;cameraGoal.copy(homeCamera);targetGoal.copy(homeTarget)};
controls.addEventListener('start',()=>{if(!document.body.classList.contains('room-content-open')){focusActive=false;returningHome=false}});
document.addEventListener('room-content-closed',resetCamera);
document.addEventListener('room-record-playing',event=>{vinyl.userData.playing=!!event.detail?.playing});

const resize=()=>{
  const w=mount.clientWidth||innerWidth,h=mount.clientHeight||innerHeight,aspect=w/h;
  const frustumH=mobile?11.7:9.6;camera.left=-frustumH*aspect/2;camera.right=frustumH*aspect/2;camera.top=frustumH/2;camera.bottom=-frustumH/2;camera.updateProjectionMatrix();renderer.setSize(w,h,false)
};
new ResizeObserver(resize).observe(mount);resize();

const clock3d=new THREE.Clock();
const animate=()=>{
  const dt=Math.min(clock3d.getDelta(),.05),ease=reducedMotion?1:Math.min(1,dt*5.5);
  if(focusActive){
    camera.position.lerp(cameraGoal,ease);controls.target.lerp(targetGoal,ease);
    if(returningHome&&camera.position.distanceToSquared(homeCamera)<.0004&&controls.target.distanceToSquared(homeTarget)<.0004){camera.position.copy(homeCamera);controls.target.copy(homeTarget);focusActive=false;returningHome=false}
  }
  controls.update();
  for(const k of['hemi','sun','pendant','ambient','window','exposure'])currentLight[k]=THREE.MathUtils.lerp(currentLight[k],wantedLight[k],Math.min(1,dt*2.2));
  hemi.intensity=currentLight.hemi;sun.intensity=currentLight.sun;pendantLight.intensity=currentLight.pendant;ambient.intensity=currentLight.ambient;windowLight.intensity=currentLight.window;renderer.toneMappingExposure=currentLight.exposure;
  scene.background.lerp(new THREE.Color(wantedLight.bg),Math.min(1,dt*1.8));windowPane.material.color.lerp(new THREE.Color(wantedLight.pane),Math.min(1,dt*1.8));
  if(vinyl.userData.playing&&!reducedMotion)vinyl.rotation.y+=dt*.45;
  renderer.render(scene,camera);requestAnimationFrame(animate)
};
animate();

requestAnimationFrame(()=>requestAnimationFrame(()=>{document.querySelector('#room3d-loading')?.classList.add('is-ready');document.body.classList.add('room3d-ready')}));
