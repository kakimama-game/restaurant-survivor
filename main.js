import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SU from 'three/addons/utils/SkeletonUtils.js';
"use strict";
const $=id=>document.getElementById(id);
const T=16,K=1/8; // game logic in "px" (16 per tile), world = px*K
// ================= renderer =================
const cvs=$('gl'),hud=$('hud'),hx=hud.getContext('2d');
const renderer=new THREE.WebGLRenderer({canvas:cvs,antialias:(devicePixelRatio||1)<2,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x1a100a);scene.fog=new THREE.Fog(0x1a100a,38,70);
const camera=new THREE.PerspectiveCamera(45,1,0.5,200);
scene.add(new THREE.HemisphereLight(0xfff4e0,0x5a4030,1.6));
const sun=new THREE.DirectionalLight(0xffffff,1.6);sun.position.set(-8,20,10);scene.add(sun);scene.add(sun.target);
let VWpx=180,VHpx=320,DPR=1;
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);DPR=Math.min(devicePixelRatio||1,2);hud.width=w*DPR;hud.height=h*DPR;camera.aspect=w/h;
 const D=23,W=Math.min(22,22*Math.max(1,h/w)*0.75);const hf=2*Math.atan(W/2/D);let vf=2*Math.atan(Math.tan(hf/2)/camera.aspect);if(w>h)vf=2*Math.atan(W*0.75/2/D);camera.fov=vf*180/Math.PI;camera.updateProjectionMatrix();VWpx=Math.min(w,h)/Math.min(w,h)*W/K}
addEventListener('resize',resize);resize();
// ================= assets =================
const loader=new GLTFLoader();
const EN_MODELS=['GreenBlob','PinkBlob','Mushnub','Chicken','Pigeon','Cactoro','Fish','Dog','Cat','Wizard','Ghost','Armabee','Glub','Squidle','Goleling','Hywirl','Dragon'];
const BOSS_MODELS=['MushroomKing','Yeti','BlueDemon','Demon'];
const M={};let REST=null,FOODG=null,loaded=0,total=0,READY=false;
function loadGLB(url){total++;return new Promise(ok=>loader.load(url,g=>{loaded++;prog();ok(g)},undefined,e=>{console.warn('load fail',url,e);loaded++;prog();ok(null)}))}
function prog(){const p=Math.round(loaded/Math.max(1,total)*100);$('loadMsg').textContent=p<100?'読み込み中… '+p+'%':'準備OK！'}
function prepChar(g,h){ // returns {proto, clips}
 if(!g)return null;const s=g.scene;s.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(/2H_|Offhand|Rectangle|Spike|Badge|Mug/i.test(o.name))o.visible=false}});
 s.updateMatrixWorld(true);const box=new THREE.Box3();s.traverse(o=>{if(o.isMesh&&o.visible){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);box.union(b)}});
 const sz=box.getSize(new THREE.Vector3());const sc=h/Math.max(0.01,sz.y);const w=new THREE.Group();s.scale.setScalar(sc);s.position.set(0,-box.min.y*sc,0);w.add(s);
 const clips={};for(const c of g.animations)clips[c.name]=c;return {proto:w,clips}}
async function loadAll(){
 const ps=[loadGLB('assets/models/restaurant.glb').then(g=>{REST=g&&g.scene}),loadGLB('assets/models/foods.glb').then(g=>{FOODG=g&&g.scene}),loadGLB('assets/models/player.glb').then(g=>M.player=prepChar(g,2.6))];
 for(const n of EN_MODELS)ps.push(loadGLB('assets/models/e_'+n+'.glb').then(g=>M['e_'+n]=prepChar(g,1.9)));
 for(const n of BOSS_MODELS)ps.push(loadGLB('assets/models/b_'+n+'.glb').then(g=>M['b_'+n]=prepChar(g,1)));
 await Promise.all(ps);READY=true;prog();$('bNew').disabled=false;$('bCont').disabled=false;if(!load())$('bCont').style.display='none'}
// ---- props (instanced) ----
const PROPS={};const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_v=new THREE.Vector3(),_s=new THREE.Vector3(),_e=new THREE.Euler(),_c=new THREE.Color();
function propParts(name){if(PROPS[name])return PROPS[name];const parts=[];const node=(REST&&REST.children.find(c=>c.name===name))||(FOODG&&FOODG.children.find(c=>c.name===name));
 if(node){(REST||FOODG).updateMatrixWorld(true);FOODG&&FOODG.updateMatrixWorld(true);const inv=node.matrixWorld.clone().invert();node.traverse(o=>{if(o.isMesh)parts.push({geo:o.geometry,mat:o.material,m:inv.clone().multiply(o.matrixWorld)})})}
 else{parts.push({geo:new THREE.BoxGeometry(1.8,1,1.8).translate(0,0.5,0),mat:new THREE.MeshStandardMaterial({color:0x886655}),m:new THREE.Matrix4()})}
 return PROPS[name]=parts}
function mtx(x,y,z,ry,sx,sy,sz){_e.set(0,ry||0,0);_q.setFromEuler(_e);return new THREE.Matrix4().compose(_v.set(x,y,z),_q,_s.set(sx??1,sy??sx??1,sz??sx??1))}
class Builder{constructor(){this.m=new Map()}add(name,m,color){let a=this.m.get(name);if(!a)this.m.set(name,a=[]);a.push({m,color})}
 build(group){for(const [name,list] of this.m){for(const p of propParts(name)){const im=new THREE.InstancedMesh(p.geo,p.mat,list.length);list.forEach((it,i)=>{im.setMatrixAt(i,_m.multiplyMatrices(it.m,p.m));if(it.color)im.setColorAt(i,it.color)});
  if(list.some(it=>it.color)&&!im.instanceColor){}if(im.instanceColor)list.forEach((it,i)=>{if(!it.color)im.setColorAt(i,_c.set(1,1,1))});im.computeBoundingSphere();group.add(im)}}}}
// immediate-mode instanced meshes
class IMesh{constructor(parts,max,colored){this.list=parts.map(p=>{const mat=Array.isArray(p.mat)?p.mat:p.mat;const im=new THREE.InstancedMesh(p.geo,mat,max);im.frustumCulled=false;im.count=0;if(colored)im.setColorAt(0,_c.set(1,1,1));scene.add(im);return {im,m:p.m}});this.n=0;this.max=max}
 begin(){this.n=0}put(m,color){if(this.n>=this.max)return;for(const l of this.list){l.im.setMatrixAt(this.n,_m.multiplyMatrices(m,l.m));if(color&&l.im.instanceColor)l.im.setColorAt(this.n,color)}this.n++}
 end(){for(const l of this.list){l.im.count=this.n;l.im.instanceMatrix.needsUpdate=true;if(l.im.instanceColor)l.im.instanceColor.needsUpdate=true}}}
const basic=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:o!==undefined,opacity:o??1,depthWrite:o===undefined});
let IM={};
function initIM(){
 IM.bolt=new IMesh([{geo:new THREE.SphereGeometry(0.28,8,6),mat:basic(0xfff4a0),m:new THREE.Matrix4()}],400,true);
 IM.eb=new IMesh([{geo:new THREE.SphereGeometry(0.36,8,6),mat:basic(0xff40ff),m:new THREE.Matrix4()}],600);
 IM.gem=new IMesh([{geo:new THREE.OctahedronGeometry(0.3),mat:new THREE.MeshBasicMaterial({color:0xffffff}),m:new THREE.Matrix4()}],500,true);
 IM.shadow=new IMesh([{geo:new THREE.CircleGeometry(1,16).rotateX(-Math.PI/2),mat:new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:0.35,depthWrite:false}),m:new THREE.Matrix4()}],400);
 IM.knife=new IMesh(propParts('knife'),60);IM.plate=new IMesh(propParts('plate'),20);IM.burger=new IMesh(propParts('food_burger'),60);
 IM.pot=new IMesh(propParts('pot_large'),6,true);IM.lid=new IMesh(propParts('lid_large'),6,true);IM.pan=new IMesh(propParts('pan_A'),4);
 for(const f of FOODS)IM['f_'+f]=new IMesh(propParts(f),200,true);}
// immediate-mode simple meshes (hazards, fx)
const POOL={disc:[],ring:[],rect:[]},PI_={disc:0,ring:0,rect:0};
const GEO={disc:new THREE.CircleGeometry(1,32).rotateX(-Math.PI/2),ring:new THREE.RingGeometry(0.9,1,40).rotateX(-Math.PI/2),rect:new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2).translate(0.5,0,0)};
function prim(k,x,z,y,sx,sz,ry,color,op){let m=POOL[k][PI_[k]];if(!m){m=new THREE.Mesh(GEO[k],new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide}));m.renderOrder=2;scene.add(m);POOL[k].push(m)}PI_[k]++;
 m.visible=true;m.position.set(x,y,z);m.scale.set(sx,1,sz);m.rotation.set(0,ry||0,0);m.material.color.set(color);m.material.opacity=op;return m}
function primBegin(){for(const k in PI_)PI_[k]=0}function primEnd(){for(const k in POOL)for(let i=PI_[k];i<POOL[k].length;i++)POOL[k][i].visible=false}
// ================= definitions =================
const FOODS=['food_ingredient_tomato','food_burger','food_ingredient_onion','food_ingredient_carrot','food_ingredient_cheese','food_vegetableburger','food_ingredient_potato','food_ingredient_ham'];
// enemy roster (order = progression)
const ROSTER=[
 {n:'グリーンスライム',m:'GreenBlob',sp:22,an:'Walk'},{n:'トマトン',food:'food_ingredient_tomato',sp:28},{n:'ハト',m:'Pigeon',sp:40,an:'Walk'},
 {n:'キノコっ子',m:'Mushnub',sp:24,an:'Walk'},{n:'暴走バーガー',food:'food_burger',sp:30},{n:'ニワトリ',m:'Chicken',sp:34,an:'Walk'},
 {n:'のらネコ',m:'Cat',sp:38,an:'Walk'},{n:'タマネギ兵',food:'food_ingredient_onion',sp:26},{n:'グラブ',m:'Glub',sp:30,an:'Fast_Flying'},
 {n:'キラービー',m:'Armabee',sp:44,an:'Fast_Flying'},{n:'ピンクスライム',m:'PinkBlob',sp:26,an:'Walk'},{n:'ニンジン騎士',food:'food_ingredient_carrot',sp:34},
 {n:'サカナ男',m:'Fish',sp:30,an:'Walk'},{n:'サボテン',m:'Cactoro',sp:24,an:'Walk'},{n:'おばけ',m:'Ghost',sp:34,an:'Fast_Flying'},
 {n:'チーズブロック',food:'food_ingredient_cheese',sp:22},{n:'イカ',m:'Squidle',sp:32,an:'Fast_Flying'},{n:'番犬',m:'Dog',sp:42,an:'Walk'},
 {n:'ゴーレム',m:'Goleling',sp:24,an:'Fast_Flying'},{n:'つむじ風',m:'Hywirl',sp:40,an:'Fast_Flying'},{n:'ベジバーガー',food:'food_vegetableburger',sp:30},
 {n:'魔法使い',m:'Wizard',sp:30,an:'Walk'},{n:'ポテトン',food:'food_ingredient_potato',sp:26},{n:'ミニドラゴン',m:'Dragon',sp:34,an:'Fast_Flying'},{n:'ハムの塊',food:'food_ingredient_ham',sp:24}];
ROSTER.forEach((t,i)=>{t.idx=i;t.hp=5+i*2.6;t.dmg=5+i*0.8;t.xp=1+Math.floor(i/4);t.r=5+(i>15?1:0)});
const BOSSES=[
 {n:'マッシュルーム料理長',m:'MushroomKing',col:0xffffff,h:7.0},
 {n:'冷凍庫の雪男',m:'Yeti',col:0xbfe8ff,h:7.5},
 {n:'地獄のソムリエ',m:'BlueDemon',col:0xc0a0ff,h:8.0},
 {n:'魔王シェフ',m:'Demon',col:0xff9090,h:9.0}];
const WDEF={
 bolt:{n:'スパイスボルト',d:'最も近い敵へスパイス弾を撃つ'},
 whip:{n:'フライパン',d:'左右をフライパンでなぎ払う'},
 orb:{n:'回転プレート',d:'周囲を回るお皿'},
 axe:{n:'包丁投げ',d:'上に投げる重い包丁（貫通）'},
 bomb:{n:'ペッパーボム',d:'ランダムな場所で爆発'}};
const SPEC={
 aura:{n:'聖なるオーラ',d:'周囲の敵に継続ダメージ',w:1},
 chain:{n:'チェインライトニング',d:'敵から敵へ連鎖する雷',w:1},
 laser:{n:'ホーリーレーザー',d:'一直線に敵を貫く光線',w:1},
 fam:{n:'使い魔',d:'あなたを追う使い魔が魔法弾を撃つ',w:1},
 revive:{n:'不死鳥の羽',d:'各階でLv回まで倒れても復活（HP50%）'},
 dblxp:{n:'知恵の書',d:'獲得経験値+50%/Lv'},
 lifesteal:{n:'吸血の牙',d:'与ダメージの一部でHP回復'},
 thorns:{n:'いばらの鎧',d:'触れた敵に反撃ダメージ'}};
const STATS={might:{n:'ちから',d:'ダメージ+15%'},speed:{n:'すばやさ',d:'移動速度+10%'},maxhp:{n:'タフネス',d:'最大HP+20・全回復'},haste:{n:'クイック',d:'攻撃間隔-8%'},magnet:{n:'マグネット',d:'経験値を引き寄せる範囲+40%'},regen:{n:'リジェネ',d:'HPが毎秒0.5回復'},area:{n:'エリア',d:'攻撃範囲+12%'}};
// ================= v2: shops, foods, behaviors =================
const FOODJ={'bowl-broth':'ラーメン','bowl-soup':'スープ','egg-cooked':'目玉焼き','maki-roe':'いくら巻き','maki-salmon':'サーモン巻き','maki-vegetable':'かっぱ巻き','sushi-egg':'玉子寿司','sushi-salmon':'サーモン寿司','rice-ball':'おにぎり','fish':'焼き魚','bread':'食パン','croissant':'クロワッサン','loaf-baguette':'バゲット','loaf-round':'カンパーニュ','muffin':'マフィン','pie':'アップルパイ','pizza':'ピザ','mushroom':'マッシュルーム','paprika':'パプリカ','cheese':'チーズ','cake':'ケーキ','cupcake':'カップケーキ','donut-sprinkles':'カラフルドーナツ','donut-chocolate':'チョコドーナツ','ice-cream':'ソフトクリーム','sundae':'パフェ','waffle':'ワッフル','pancakes':'パンケーキ','cup-coffee':'コーヒー','frappe':'フラッペ','cookie-chocolate':'チョコクッキー','chinese':'中華テイクアウト','dim-sum':'小籠包','steamer':'せいろ蒸し','skewer-vegetables':'野菜串','eggplant':'ナス','burger-cheese':'チーズバーガー','fries':'フライドポテト','hot-dog':'ホットドッグ','soda':'ソーダ','corn-dog':'アメリカンドッグ','sandwich':'サンドイッチ','taco':'タコス','watermelon':'スイカ','strawberry':'いちご','banana':'バナナ','pineapple':'パイナップル','meat-ribs':'スペアリブ','turkey':'ローストチキン','whole-ham':'骨付きハム','popsicle':'アイスキャンディー','lollypop':'ペロペロキャンディ','pudding':'プリン','leek':'ネギ','food_burger':'ビッグバーガー','food_stew':'ビーフシチュー','food_dinner':'ステーキディナー','pot_A_stew':'寸胴カレー'};
const FOODK=Object.keys(FOODJ);
const SHOPS=[
 {n:'ラーメン屋「麺屋たわー」',sign:'🍜 麺屋 たわー',fl:'wood',c1:'#8a5a3a',c2:'#7a4e33',wall:0x4a2a1c,sb:'#7a1a10',border:['kitchencounter_straight_A','kitchencounter_straight_B','stove_multi','stove_single','kitchencounter_sink','pot_large'],deco:['kitchentable_A','kitchentable_B','table_round_A_small'],scatter:['bowl-broth','chopstick','leek','soy','chair_stool'],foods:['bowl-broth','bowl-soup','egg-cooked','leek','dim-sum'],beh:['shoot','dash','explode']},
 {n:'寿司屋「すし処 波」',sign:'🍣 すし処 波',fl:'tatami',c1:'#c8c08a',c2:'#b5ac78',wall:0x2e3b2e,sb:'#1e3a5a',border:['kitchencounter_straight_B','wall_orderwindow','fridge_B','kitchencounter_straight_A_backsplash'],deco:['kitchentable_A_large','kitchentable_B'],scatter:['cutting-board-japanese','maki-salmon','fish','sushi-egg'],foods:['maki-roe','maki-salmon','maki-vegetable','sushi-egg','sushi-salmon','rice-ball','fish'],beh:['kite','split','shoot']},
 {n:'ベーカリー「こむぎ堂」',sign:'🥐 こむぎ堂ベーカリー',fl:'tile',c1:'#e8d6b8',c2:'#dcc8a8',wall:0x8a5a3a,sb:'#a0602a',border:['oven','kitchentable_A_large_decorated','shelf_papertowel_decorated','kitchencounter_straight_decorated','crate_buns'],deco:['kitchentable_A','crate_buns','jar_A_large'],scatter:['bread','loaf-baguette','croissant','loaf-round'],foods:['bread','croissant','loaf-baguette','loaf-round','muffin','pie','sandwich'],beh:['explode','shield','split']},
 {n:'ピザ屋「ナポリたわー」',sign:'🍕 PIZZERIA ナポリ',fl:'terracotta',c1:'#b8683e',c2:'#a85c36',wall:0x6a2418,sb:'#2a6a2a',border:['oven','crate_tomatoes','crate_cheese','kitchencounter_straight_A','wall_window_open'],deco:['table_round_A_decorated','table_round_B'],scatter:['pizza-box','pizza','paprika','chair_A'],foods:['pizza','mushroom','paprika','cheese','taco','meat-ribs'],beh:['shoot','explode','summon']},
 {n:'カフェ「スイーツ天国」',sign:'🍰 Café スイーツ天国',fl:'tile',c1:'#efd0d4',c2:'#e4c2c8',wall:0x5e3044,sb:'#c0507a',border:['wall_window_open','wall_decorated','table_round_A_decorated','pillar_B','fridge_A_decorated'],deco:['table_round_A_decorated','table_round_A_small'],scatter:['cake','cup-coffee','cupcake','chair_B'],foods:['cake','cupcake','donut-sprinkles','donut-chocolate','ice-cream','sundae','waffle','pancakes','cup-coffee','frappe','cookie-chocolate','pudding','strawberry'],beh:['kite','split','summon']},
 {n:'中華料理「龍飯店」',sign:'🥟 中華料理 龍飯店',fl:'tile',c1:'#9a3a30',c2:'#8c342b',wall:0x3a0e0e,sb:'#c09020',border:['stove_multi_decorated','pillar_B','wall_decorated','kitchencounter_straight_decorated','pot_A_stew'],deco:['table_round_A','table_round_B','stew_pot'],scatter:['steamer','dim-sum','chinese','skewer-vegetables'],foods:['chinese','dim-sum','steamer','skewer-vegetables','eggplant','turkey'],beh:['shield','dash','shoot']},
 {n:'バーガーショップ「ジャンクたわー」',sign:'🍔 JUNK BURGER',fl:'diner',c1:'#cfe2dc',c2:'#bcd4cc',wall:0x1f4a58,sb:'#d04020',border:['kitchencounter_straight_A','fridge_A','dishrack_plates','stove_single','kitchencounter_sink_backsplash'],deco:['kitchentable_B_large','table_round_A_small'],scatter:['fries','soda','burger-cheese','hot-dog'],foods:['burger-cheese','fries','hot-dog','soda','corn-dog','sandwich','food_burger','popsicle','watermelon'],beh:['dash','explode','kite','summon','shield']}];
const THEMES=SHOPS;const shopOf=f=>SHOPS[Math.floor((f-1)/5)%SHOPS.length];
const BEH_UNLOCK={shoot:2,dash:3,kite:4,split:5,explode:6,shield:7,summon:9};
const BEHC={shoot:0xff9030,kite:0xffe040,dash:0xff3030,split:0x60ff60,explode:0xff2020,shield:0x50a0ff,summon:0xc060ff};
const _tex={};
function floorTex(th){const key=th.fl+th.c1;if(_tex[key])return _tex[key];const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');const C1=new THREE.Color(th.c1),C2=new THREE.Color(th.c2);
 const mix=(t)=>'#'+C1.clone().lerp(C2,t).getHexString();const dark=(col,k)=>'#'+new THREE.Color(col).multiplyScalar(k).getHexString();
 let r=7;const R=()=>(r=(r*9301+49297)%233280)/233280;
 if(th.fl==='wood'){for(let y=0;y<256;y+=32){let x=-(R()*128)|0;while(x<256){const w=96+(R()*96|0);g.fillStyle=mix(R());g.fillRect(x,y,w,32);g.fillStyle='rgba(0,0,0,0.05)';for(let i=0;i<5;i++)g.fillRect(x,y+4+R()*24,w,1);g.fillStyle=dark(th.c2,0.85);g.fillRect(x,y,2,32);x+=w}g.fillStyle=dark(th.c2,0.82);g.fillRect(0,y,256,2)}}
 else if(th.fl==='tatami'){g.fillStyle=th.c1;g.fillRect(0,0,256,256);g.fillStyle='rgba(80,70,20,0.07)';for(let x=0;x<256;x+=4)g.fillRect(x,0,1,256);g.fillStyle=th.c2;g.fillRect(0,0,256,6);g.fillRect(0,128,128,6);g.fillRect(128,0,6,256);g.fillStyle='#5a6a4a';g.fillRect(0,0,256,3);g.fillRect(128,0,3,256)}
 else{const n=th.fl==='diner'?4:th.fl==='terracotta'?4:2,s=256/n,gr=th.fl==='terracotta'?5:3;g.fillStyle=dark(th.c2,0.88);g.fillRect(0,0,256,256);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){g.fillStyle=th.fl==='diner'?((x+y)%2?th.c1:th.c2):mix(R()*0.8);g.fillRect(x*s+gr/2,y*s+gr/2,s-gr,s-gr);g.fillStyle='rgba(255,255,255,0.05)';g.fillRect(x*s+gr/2,y*s+gr/2,s-gr,4)}}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return _tex[key]=t}
function makeSign(th){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle=th.sb;g.beginPath();g.roundRect(4,4,504,120,22);g.fill();g.lineWidth=8;g.strokeStyle='#fff3d0';g.stroke();g.fillStyle='#fff';g.font='bold 54px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(th.sign,256,68);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(8,2),new THREE.MeshBasicMaterial({map:t,transparent:true}));m.userData.own=1;return m}
const _fs={};function fsize(name){if(_fs[name])return _fs[name];const b=new THREE.Box3();for(const p of propParts(name)){p.geo.computeBoundingBox();b.union(p.geo.boundingBox.clone().applyMatrix4(p.m))}const s=b.getSize(new THREE.Vector3());return _fs[name]=Math.max(s.x,s.y,s.z)||1}
function foodIM(name){const k='F_'+name;return IM[k]||(IM[k]=new IMesh(propParts(name),120))}
// collection log
let ZK={};try{ZK=JSON.parse(localStorage.getItem('rsurv_zukan'))||{}}catch(e){}
function zkSave(){try{localStorage.setItem('rsurv_zukan',JSON.stringify(ZK))}catch(e){}}
function showZukan(){const n=FOODK.filter(k=>ZK[k]).length;$('zkCount').textContent=n+' / '+FOODK.length;$('zkList').innerHTML=FOODK.map(k=>ZK[k]?`<div class="zi">🍽️ ${FOODJ[k]}<small>×${ZK[k]}</small></div>`:'<div class="zi no">？？？</div>').join('');$('zk').classList.add('on')}
// fleeing food
let FOODC=null,foodT=12;
function spawnFoodC(){const sh=shopOf(floor);for(let i=0;i<30;i++){const a=Math.random()*6.28,d=120+Math.random()*140,x=P.x+Math.cos(a)*d,y=P.y+Math.sin(a)*d;if(solid((x/T)|0,(y/T)|0)||solid(((x+6)/T)|0,((y+6)/T)|0)||solid(((x-6)/T)|0,((y-6)/T)|0))continue;
  const name=Math.random()<0.7?sh.foods[(Math.random()*sh.foods.length)|0]:FOODK[(Math.random()*FOODK.length)|0];FOODC={x,y,name,life:30,wx:0,wy:0,wt:0};fx.push({type:'text',txt:'✨ '+FOODJ[name]+'が逃げ回っている！',life:2.2});return}}
function updFood(dt){if(!FOODC){if(bossPhase!==2){foodT-=dt;if(foodT<=0){foodT=5;spawnFoodC()}}return}const F=FOODC;F.life-=dt;
 const dx=F.x-P.x,dy=F.y-P.y,d=Math.hypot(dx,dy)||1;F.wt-=dt;if(F.wt<=0){F.wt=0.6+Math.random();const a=Math.random()*6.28;F.wx=Math.cos(a);F.wy=Math.sin(a)}
 let vx=F.wx*35,vy=F.wy*35;if(d<110){vx=dx/d*60+F.wx*25;vy=dy/d*60+F.wy*25}moveCirc(F,vx*dt,vy*dt,4);
 if(d<13){for(const g of gems)g.pull=2;ZK[F.name]=(ZK[F.name]||0)+1;zkSave();SND.play('se_chest',0.7);SND.play('se_lvup',0.5);
  fx.push({type:'text',txt:'★ '+FOODJ[F.name]+' ゲット！'+(ZK[F.name]===1?' NEW!':''),life:2.5});fx.push({type:'text',txt:'経験値をぜんぶ吸い寄せ！',life:2.2});fx.push({type:'catch',x:F.x,y:F.y,life:0.8});FOODC=null;foodT=25+Math.random()*20;return}
 if(F.life<=0){fx.push({type:'poof',x:F.x,y:F.y,life:0.3});FOODC=null;foodT=15}}
// enemy behaviors
function setBeh(e,b){e.beh=b;e.cd=1+Math.random()*2;e.side=Math.random()<.5?1:-1;
 if(b==='shield'){e.hp*=3;e.mhp*=3;e.sp*=0.6;e.sc=1.35;e.r+=2;e.xp*=2}else if(b==='summon'){e.hp*=1.6;e.mhp*=1.6;e.sp*=0.6;e.sc=1.2;e.xp*=2}else if(b==='explode'){e.sp*=1.3}else if(b==='split'){e.sc=1.25}}
function behMove(e,dt,d,dx,dy){const ux=dx/d,uy=dy/d;let vx=ux*e.sp,vy=uy*e.sp;if(!e.beh)return [vx,vy];e.cd-=dt;
 switch(e.beh){
 case 'shoot':case 'kite':
  if(e.beh==='kite'){if(d<85){vx=-ux*e.sp;vy=-uy*e.sp}else if(d<135){vx=-uy*e.sp*0.7*e.side;vy=ux*e.sp*0.7*e.side}}
  if(e.wind>0){e.wind-=dt;vx=vy=0;if(e.wind<=0){const a=e.wa,sh=shopOf(floor);bullets.push({k:'eb',x:e.x,y:e.y,vx:Math.cos(a)*120,vy:Math.sin(a)*120,life:2.5,d:e.dmg*0.7,r:3,enemy:1,food:sh.foods[(Math.random()*sh.foods.length)|0]})}}
  else if(e.cd<=0&&d<170){e.cd=2.4+Math.random()*1.5;e.wind=0.65;e.wa=Math.atan2(dy,dx);hz.push({k:'l',x:e.x,y:e.y,a:e.wa,len:Math.min(180,d+40),w:5,warn:0.65,t:0,dm:0})}break;
 case 'dash':
  if(e.dt>0){e.dt-=dt;vx=e.dvx;vy=e.dvy}else if(e.wind>0){e.wind-=dt;vx=vy=0;if(e.wind<=0){e.dt=0.45;e.dvx=Math.cos(e.wa)*Math.max(200,e.sp*5);e.dvy=Math.sin(e.wa)*Math.max(200,e.sp*5)}}
  else if(e.cd<=0&&d<120){e.cd=3+Math.random()*2;e.wind=0.6;e.wa=Math.atan2(dy,dx);hz.push({k:'l',x:e.x,y:e.y,a:e.wa,len:110,w:e.r*2+2,warn:0.6,t:0,dm:0})}break;
 case 'explode':
  if(e.fuse>0){e.fuse-=dt;vx=vy=0;if(e.fuse<=0){e.hp=0;gems.push({x:e.x,y:e.y,v:e.xp});fx.push({type:'poof',x:e.x,y:e.y,life:0.3})}}else if(d<30){e.fuse=0.85;circ(e.x,e.y,34,0.85,e.dmg*1.5)}break;
 case 'summon':
  if(d<90){vx=-ux*e.sp;vy=-uy*e.sp}if(e.cd<=0&&d<200&&enemies.length<MAXE_FLOOR+30){e.cd=5.5;for(let i=0;i<2;i++){const c=spawnEnemy(e.x+(Math.random()-.5)*30,e.y+(Math.random()-.5)*30,undefined,true);if(c)fx.push({type:'poof',x:c.x,y:c.y,life:0.3})}fx.push({type:'summon',x:e.x,y:e.y,life:0.5})}break}
 return [vx,vy]}
// ================= state =================
const SAVE='rsurv_save_v1';
let hz=[],dpsAcc=0,dpsT=0,chests=[],P,map,MW,MH,floor=1,enemies=[],bullets=[],gems=[],fx=[],stairs=null,entrance,bossPhase=0,bossTimer=0,boss=null,state='title',time=0,spawnT=0,kills=0,deco=[];
function newPlayer(){return{x:0,y:0,hp:100,mhp:100,lv:1,xp:0,nx:5,w:{bolt:1},st:{},sp:{},cd:{},face:1,dx:0,dy:1,inv:0,orbA:0}}
function stat(k){return P.st[k]||0}
function save(){try{localStorage.setItem(SAVE,JSON.stringify({floor,P:{hp:P.mhp,mhp:P.mhp,lv:P.lv,xp:P.xp,nx:P.nx,w:P.w,st:P.st,sp:P.sp}}))}catch(e){}}
function load(){try{return JSON.parse(localStorage.getItem(SAVE))}catch(e){return null}}
// ================= views =================
const pools={};let playerView=null,famView=null,bossView=null;
function makeView(key,clipName){const md=M[key];let v;
 if(md){const obj=SU.clone(md.proto);obj.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone()}});
  const mixer=new THREE.AnimationMixer(obj);v={obj,mixer,clips:md.clips,acts:{},cur:null,key}}
 else{const obj=new THREE.Mesh(new THREE.CapsuleGeometry(0.5,0.6,4,8).translate(0,0.8,0),new THREE.MeshStandardMaterial({color:0x66cc66}));v={obj,key,acts:{}}}
 v.mats=[];v.obj.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.emissive)v.mats.push(m)})});
 scene.add(v.obj);if(clipName)playAnim(v,clipName);return v}
function playAnim(v,name,once){if(!v.mixer||v.cur===name)return;const c=v.clips[name]||v.clips.Walk||v.clips.Idle||Object.values(v.clips)[0];if(!c)return;let a=v.acts[name];if(!a)a=v.acts[name]=v.mixer.clipAction(c);
 a.reset();a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat);a.clampWhenFinished=!!once;a.play();if(v.cur&&v.acts[v.cur])v.acts[v.cur].crossFadeTo(a,0.15,false);v.cur=name;v.mixer.update(Math.random()*0.5)}
function tint(v,r,g,b){if(v._t===r*1e6+g*1e3+b)return;v._t=r*1e6+g*1e3+b;for(const m of v.mats)m.emissive.setRGB(r,g,b)}
function getView(t){const key='e_'+t.m;const p=pools[key]||(pools[key]=[]);const v=p.pop()||makeView(key,t.an);v.obj.visible=true;v.cur=null;playAnim(v,t.an);return v}
function relView(e){if(e.view){e.view.obj.visible=false;(pools['e_'+e.t.m]||(pools['e_'+e.t.m]=[])).push(e.view);e.view=null}}
// ================= dungeon (restaurant floors) =================
let levelGroup=null;
function solid(tx,ty){return tx<0||ty<0||tx>=MW||ty>=MH||map[ty*MW+tx]===1}
function clearLevel(){for(const e of enemies)relView(e);if(bossView){scene.remove(bossView.obj);bossView=null}if(levelGroup){scene.remove(levelGroup);levelGroup.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.own){if(!o.isInstancedMesh||o.geometry.type==='BoxGeometry')o.geometry.dispose();if(o.material.map&&!Object.values(_tex).includes(o.material.map))o.material.map.dispose();o.material.dispose()}})}levelGroup=new THREE.Group();scene.add(levelGroup)}
function buildLevel(){const th=shopOf(floor);const B=new Builder();const rnd=a=>a[(Math.random()*a.length)|0];
 const MG=12,w=(MW+2*MG)*2,h=(MH+2*MG)*2;const tex=floorTex(th);tex.repeat.set(w/4,h/4);
 const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,h).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:tex,roughness:0.95}));pl.position.set(MW,0,MH);pl.userData.own=1;levelGroup.add(pl);
 const wallMat=new THREE.MeshStandardMaterial({color:th.wall,roughness:1});const fills=[];
 scene.background.setHex(th.wall).multiplyScalar(0.6);scene.fog.color.copy(scene.background);
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const wx=(x*T+8)*K,wz=(y*T+8)*K;
  if(map[y*MW+x]===1){let ox=0,oy=0,n=0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<MW&&yy<MH&&map[yy*MW+xx]!==1){ox+=dx;oy+=dy;n++}}
   let diag=false;if(!n)for(const [dx,dy] of [[1,1],[-1,1],[1,-1],[-1,-1]]){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<MW&&yy<MH&&map[yy*MW+xx]!==1)diag=true}
   if(n||diag){if(n){if(Math.abs(ox)>=Math.abs(oy)){ox=Math.sign(ox);oy=0}else{oy=Math.sign(oy);ox=0}if(!ox&&!oy)oy=1}const ry=n?Math.atan2(ox,oy):0;const pn=rnd(th.border);const isWall=/^wall|pillar/.test(pn);
    if(isWall)B.add(pn,mtx(wx,0,wz,ry,0.5,0.55,0.8));else B.add(pn,mtx(wx,0,wz,ry,1,1,1))}else fills.push(wx,wz)}}
 const box=new THREE.BoxGeometry(2,1.2,2).translate(0,0.6,0);const im=new THREE.InstancedMesh(box,wallMat,fills.length/2);for(let i=0;i<fills.length;i+=2)im.setMatrixAt(i/2,mtx(fills[i],0,fills[i+1]));im.computeBoundingSphere();im.userData.own=1;levelGroup.add(im);
 for(const [cx,cz,sx,sz] of [[-MG,MH,2*MG,h],[2*MW+MG,MH,2*MG,h],[MW,-MG,2*MW,2*MG],[MW,2*MH+MG,2*MW,2*MG]]){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,1.2,sz).translate(0,0.6,0),wallMat);m.position.set(cx,0,cz);m.userData.own=1;levelGroup.add(m)}
 for(const d of deco){if(d.solid)B.add(rnd(th.deco),mtx((d.x*T+8)*K,0,(d.y*T+8)*K,((Math.random()*4)|0)*Math.PI/2,d.s||1));else{const n=rnd(th.scatter);const sc=FOODJ[n]||/-/.test(n)?0.9/fsize(n):0.8;B.add(n,mtx((d.x*T+8)*K+(Math.random()-.5),0,(d.y*T+8)*K+(Math.random()-.5),Math.random()*6.28,sc))}}
 B.build(levelGroup);
 const sg=makeSign(th);sg.position.set(W(entrance.x),3.4,W(entrance.y)-3.5);sg.rotation.x=-0.5;levelGroup.add(sg)}
let elevator=null;
function makeElevator(){if(elevator)scene.remove(elevator);elevator=new THREE.Group();const B=new Builder();B.add('door_A',mtx(-0.8,0,-0.9));B.add('door_B',mtx(0.8,0,-0.9,Math.PI));B.build(elevator);
 const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,0.12,24),new THREE.MeshBasicMaterial({color:0xffd84a}));pad.position.y=0.06;elevator.add(pad);
 const arr=new THREE.Mesh(new THREE.ConeGeometry(0.45,0.8,4),new THREE.MeshBasicMaterial({color:0x80ffff}));arr.position.y=2.3;elevator.add(arr);elevator.userData.arr=arr;elevator.visible=false;scene.add(elevator)}
function genFloor(){
 clearLevel();for(const e of enemies)relView(e);enemies.length=bullets.length=gems.length=fx.length=0;chests.length=0;hz.length=0;dpsAcc=0;dpsT=0;P.revUsed=0;boss=null;deco=[];
 const isBoss=floor%5===0;
 if(isBoss){MW=30;MH=30;map=new Uint8Array(MW*MH).fill(1);for(let y=2;y<MH-2;y++)for(let x=2;x<MW-2;x++)map[y*MW+x]=0;
  for(const [x,y] of [[6,6],[23,6],[6,23],[23,23]])deco.push({x,y,solid:0});
  entrance={x:15*T+8,y:25*T+8};stairs=null;bossPhase=1;bossTimer=180;for(const [cx_,cy_] of [[5,6],[24,20]].sort(()=>Math.random()-.5).slice(0,1+(Math.random()*2|0)))chests.push({x:cx_*T+8,y:cy_*T+8});}
 else{bossPhase=0;MW=60;MH=60;map=new Uint8Array(MW*MH).fill(1);const rooms=[];
  for(let i=0;i<60&&rooms.length<10;i++){const w=6+(Math.random()*8|0),h=6+(Math.random()*8|0),x=2+(Math.random()*(MW-w-4)|0),y=2+(Math.random()*(MH-h-4)|0);
   if(rooms.some(r=>x<r.x+r.w+2&&x+w+2>r.x&&y<r.y+r.h+2&&y+h+2>r.y))continue;rooms.push({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1)});
   for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)map[yy*MW+xx]=0}
  const corr=new Set();
  for(let i=1;i<rooms.length;i++){const a=rooms[i-1],b=rooms[i];let x=a.cx,y=a.cy;
   while(x!==b.cx){for(let k=0;k<3;k++){map[(y+k-1)*MW+x]=0;corr.add((y+k-1)*MW+x)}x+=Math.sign(b.cx-x)}
   while(y!==b.cy){for(let k=0;k<3;k++){map[y*MW+x+k-1]=0;corr.add(y*MW+x+k-1)}y+=Math.sign(b.cy-y)}}
  const a=rooms[0];let far=rooms[1],fd=0;for(const r of rooms){const d=Math.hypot(r.cx-a.cx,r.cy-a.cy);if(d>fd){fd=d;far=r}}
  entrance={x:a.cx*T+8,y:a.cy*T+8};stairs={x:far.cx*T+8,y:far.cy*T+8};
  // furniture obstacles: isolated cells inside rooms (never blocks connectivity)
  for(const r of rooms)for(let y=r.y+1;y<r.y+r.h-1;y++)for(let x=r.x+1;x<r.x+r.w-1;x++){if(corr.has(y*MW+x)||Math.abs(x-r.cx)<2&&Math.abs(y-r.cy)<2)continue;if(Math.random()>0.09)continue;
   let ok=true;for(let dy=-1;dy<=1&&ok;dy++)for(let dx=-1;dx<=1;dx++)if(map[(y+dy)*MW+x+dx]!==0){ok=false;break}
   if(ok){map[y*MW+x]=3;deco.push({x,y,solid:1})}else if(Math.random()<0.3)deco.push({x,y,solid:0})}
  for(let i=0;i<map.length;i++)if(map[i]===3)map[i]=1;
  // re-mark decorated solid cells: they are solid (1) but rendered by deco; avoid border prop on them
  for(const r of rooms){if(r===a)continue;const n=3+floor+(Math.random()*4|0);for(let i=0;i<n;i++)spawnEnemy((r.x+1+Math.random()*(r.w-2))*T,(r.y+1+Math.random()*(r.h-2))*T)}}
 // deco solid cells must not get border props: mark them temporarily
 for(const d of deco)if(d.solid)map[d.y*MW+d.x]=4;
 FOODC=null;foodT=10+Math.random()*8;buildLevel();for(const d of deco)if(d.solid)map[d.y*MW+d.x]=1;
 // solid() treats 1 only; make deco solid count: (value 1)
 P.x=entrance.x;P.y=entrance.y;P.hp=P.mhp;floorBgm();P.inv=1.5;spawnT=0;time=0;save();
}
function spawnEnemy(x,y,forceIdx,noBeh){if(solid((x/T)|0,(y/T)|0))return;const mx=Math.min(ROSTER.length-1,1+floor),mn=Math.max(0,mx-5);const t=ROSTER[forceIdx??(mn+Math.floor(Math.random()*(mx-mn+1)))];const k=1+floor*0.22;
 const e={x,y,t,hp:t.hp*k,mhp:t.hp*k,sp:t.sp*(1+floor*0.015),dmg:t.dmg*(1+floor*0.1),xp:t.xp,r:t.r,hit:0,kx:0,ky:0,ph0:Math.random()*6};if(!noBeh&&Math.random()<Math.min(0.45,0.05+0.05*floor)){const o=shopOf(floor).beh.filter(b=>BEH_UNLOCK[b]<=floor);if(o.length)setBeh(e,o[(Math.random()*o.length)|0])}enemies.push(e);return e}
function spawnBoss(){const tier=Math.floor(floor/5)-1,b=BOSSES[tier%4],lap=Math.floor(tier/4);const base=(600+tier*700)*(1+lap*2)*4;const dps=dpsAcc/Math.max(20,dpsT);const hp=Math.round(Math.max(base,dps*1.2*80));
 boss={x:15*T+8,y:6*T,t:{},bd:b,hp,mhp:hp,sp:22+tier*3,dmg:(26+tier*10)*(1+lap*0.8),xp:50,r:12+tier,hit:0,kx:0,ky:0,isBoss:1,atk:2.5,tier:tier%4,lap,ph:1,ai:null,bud:0};boss.bud=boss.mhp/65*2;enemies.push(boss);bossPhase=2;SND.play('se_boss',0.7);floorBgm();
 const md=M['b_'+b.m];if(md){bossView=makeView('b_'+b.m,'Walk');bossView.obj.scale.setScalar(b.h);bossView.obj.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.color&&m.color.multiply(new THREE.Color(b.col)))})}
 fx.push({type:'text',txt:b.n+' 出現！',life:2.5})}
// ================= input =================
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.key==='Escape'||e.key==='p')togglePause()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
let joy=null;
hud.style.pointerEvents='none';
cvs.addEventListener('pointerdown',e=>{joy={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY}});
addEventListener('pointermove',e=>{if(joy&&joy.id===e.pointerId){joy.x=e.clientX;joy.y=e.clientY}});
addEventListener('pointerup',e=>{if(joy&&joy.id===e.pointerId)joy=null});addEventListener('pointercancel',()=>joy=null);
// ================= grid =================
const GS=32;let grid=new Map();
function buildGrid(){grid.clear();for(const e of enemies){const k=((e.x/GS)|0)*4096+((e.y/GS)|0);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(e)}}
function near(x,y,r,cb){const x0=((x-r)/GS)|0,x1=((x+r)/GS)|0,y0=((y-r)/GS)|0,y1=((y+r)/GS)|0;for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){const a=grid.get(gx*4096+gy);if(a)for(const e of a)cb(e)}}
function dmgMul(){return 1+0.15*stat('might')}
function areaMul(){return 1+0.12*stat('area')}
// ================= boss AI (same as 2D) =================
function radial(e,n,sp,off,dm){for(let i=0;i<n;i++){const a=off+i*6.283/n;bullets.push({k:'eb',x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:5,d:dm,r:3,enemy:1})}}
function circ(x,y,r,warn,dm){hz.push({k:'c',x,y,r,warn,t:0,dm})}
function hitP(dm){if(P.inv>0)return;P.hp-=dm;P.inv=0.6;SND.play('se_hurt',0.5);fx.push({type:'flash',life:0.15})}
const BPAT=[['charge','slam','charge','radial'],['leap','summon','spin','leap'],['spiral','summon','tele','fan'],['sweep','meteor','charge','spiral','leap','summon']];
function bossAI(e,dt,d,dx,dy){const p2=e.ph===2,k=p2?1.5:1;e.bud=Math.min(e.mhp/65*2,e.bud+e.mhp/65*dt);
 if(e.ph===1&&e.hp<e.mhp*0.5){e.ph=2;fx.push({type:'text',txt:e.bd.n+' 怒り状態！',life:2});SND.play('se_boss',0.7);radial(e,24,90,0,e.dmg*0.5)}
 let a=e.ai;if(!a){a=e.ai={st:'walk',t:0,cd:2,i:0}}a.t+=dt;const sp=e.sp*k,ux=dx/d,uy=dy/d;e.mvx=0;e.mvy=0;const D=e.dmg;
 const done=dur=>{if(a.t>=dur){e.ai={st:'walk',t:0,cd:(p2?1.1:1.8)-e.tier*0.1,i:a.i}}};
 switch(a.st){
 case 'walk':a.cd-=dt;if(a.cd<=0){const pats=BPAT[e.tier];const nx=pats[a.i%pats.length];e.ai={st:nx,t:0,i:a.i+1};startPat(e,e.ai,p2)}return [ux*sp,uy*sp];
 case 'charge':if(a.t<0.8){return [0,0]}if(a.t<1.45){e.mvx=a.cx*(260*k);e.mvy=a.cy*(260*k)}else done(p2?1.6:1.9);return [0,0];
 case 'slam':if(a.t>=1.0&&!a.f){a.f=1;radial(e,p2?20:14,80*k,Math.random(),D*0.5)}done(1.6);return [0,0];
 case 'leap':if(a.t>=1.1&&!a.f){a.f=1;e.x=a.tx;e.y=a.ty;if(p2)radial(e,12,90,0,D*0.4)}done(1.5);return [0,0];
 case 'spin':if(a.t>0.6){e.mvx=ux*sp*2.4;e.mvy=uy*sp*2.4;if(d<34)hitP(D*0.6);if(Math.random()<dt*8)fx.push({type:'boom',x:e.x,y:e.y,r:34,life:0.1})}done(p2?3.5:2.6);return [0,0];
 case 'summon':if(!a.f){a.f=1;const n=p2?8:5;for(let i=0;i<n;i++){const an=i*6.283/n;spawnEnemy(e.x+Math.cos(an)*30,e.y+Math.sin(an)*30)}}done(0.8);return [ux*sp*0.5,uy*sp*0.5];
 case 'spiral':a.cd2=(a.cd2||0)-dt;if(a.cd2<=0){a.cd2=p2?0.09:0.14;a.ang=(a.ang||0)+0.45;radial(e,p2?4:3,75,a.ang,D*0.4)}done(3);return [0,0];
 case 'fan':if(a.t>0.5&&!a.f){a.f=1;const b=Math.atan2(dy,dx);for(let j=-3;j<=3;j++){for(let q=0;q<(p2?2:1);q++){const an=b+j*0.18;bullets.push({k:'eb',x:e.x,y:e.y,vx:Math.cos(an)*(110+q*40),vy:Math.sin(an)*(110+q*40),life:4,d:D*0.5,r:3,enemy:1})}}}done(1.2);return [0,0];
 case 'radial':if(a.t>0.4&&!a.f){a.f=1;radial(e,p2?22:16,85,Math.random(),D*0.45)}if(p2&&a.t>0.9&&!a.g){a.g=1;radial(e,22,70,0.14,D*0.45)}done(1.3);return [0,0];
 case 'tele':if(a.t>=0.7&&!a.f){a.f=1;e.x=a.tx;e.y=a.ty;radial(e,p2?16:10,85,0,D*0.4)}done(1.1);return [0,0];
 case 'meteor':done(2.4);return [ux*sp*0.4,uy*sp*0.4];
 case 'sweep':if(a.t>1&&a.t<2.8){a.ang+=a.dir*dt*(p2?1.6:1.1);const c=Math.cos(a.ang),s_=Math.sin(a.ang),rx=P.x-e.x,ry=P.y-e.y,pr=rx*c+ry*s_,pd=Math.abs(-rx*s_+ry*c);if(pr>0&&pr<260&&pd<9)hitP(D*0.7)}done(3);return [0,0]}
 return [0,0]}
function startPat(e,a,p2){const D=e.dmg;a.sx=e.x;a.sy=e.y;
 if(a.st==='charge'){const dx=P.x-e.x,dy=P.y-e.y,l=Math.hypot(dx,dy)||1;a.cx=dx/l;a.cy=dy/l;hz.push({k:'l',x:e.x,y:e.y,a:Math.atan2(dy,dx),len:180,w:e.r*2,warn:0.8,t:0,dm:0})}
 if(a.st==='slam')circ(e.x,e.y,56,1.0,D);
 if(a.st==='leap'){a.tx=Math.max(4*T,Math.min((MW-4)*T,P.x));a.ty=Math.max(4*T,Math.min((MH-4)*T,P.y));circ(a.tx,a.ty,40,1.1,D*1.1)}
 if(a.st==='spin')hz.push({k:'ring',x:e.x,y:e.y,r:34,warn:0.6,t:0,dm:0,follow:e});
 if(a.st==='tele'){const an=Math.random()*6.28;a.tx=Math.max(4*T,Math.min((MW-4)*T,P.x+Math.cos(an)*70));a.ty=Math.max(4*T,Math.min((MH-4)*T,P.y+Math.sin(an)*70));circ(a.tx,a.ty,22,0.7,D*0.8)}
 if(a.st==='meteor'){const n=p2?12:8;for(let i=0;i<n;i++){const x=P.x+(i===0?0:(Math.random()-.5)*130),y=P.y+(i===0?0:(Math.random()-.5)*130);hz.push({k:'c',x,y,r:20,warn:1.0+i*0.1,t:0,dm:D*0.8,met:1})}}
 if(a.st==='sweep'){a.ang=Math.atan2(P.y-e.y,P.x-e.x)-(a.dir=Math.random()<.5?1:-1)*0.9;hz.push({k:'l',x:e.x,y:e.y,a:a.ang,len:260,w:6,warn:1,t:0,dm:0,sweep:a,boss:e})}}
function updHz(dt){for(let i=hz.length-1;i>=0;i--){const h=hz[i];h.t+=dt;if(h.follow){h.x=h.follow.x;h.y=h.follow.y}
  if(h.sweep){h.x=h.boss.x;h.y=h.boss.y;h.a=h.sweep.ang;if(h.t>2.8)h.dead=1}
  else if(h.t>=h.warn&&!h.hit){h.hit=1;if(h.k==='c'){if((P.x-h.x)**2+(P.y-h.y)**2<h.r*h.r)hitP(h.dm);fx.push({type:'boom',x:h.x,y:h.y,r:h.r,life:0.3})}h.dead=h.k==='c'||h.k==='ring'||h.k==='l'}
  if(h.dead){hz[i]=hz[hz.length-1];hz.pop()}}}
function hurt(e,d,kx,ky,src){if(e.hp<=0)return;d*=dmgMul();if(e.isBoss){if(src==='aura')d*=0.3;if(e.ai&&e.ai.st==='leap')return;d=Math.min(d,e.bud);e.bud-=d;if(d<=0)return}else{if(e.beh==='shield')d*=0.5;if(bossPhase===1)dpsAcc+=d}e.hp-=d;if(P.sp.lifesteal)P.hp=Math.min(P.mhp,P.hp+d*0.012*P.sp.lifesteal);e.hit=0.1;SND.play('se_hit',0.25,0.07);if(!e.isBoss){e.kx+=kx||0;e.ky+=ky||0}
 if(fx.length<150)fx.push({type:'num',x:e.x,y:e.y-6,txt:Math.round(d),life:0.5});
 if(e.hp<=0){kills++;SND.play('se_kill',0.3,0.05);if(fx.length<150)fx.push({type:'poof',x:e.x,y:e.y,life:0.3});
  if(e.isBoss){for(let i=0;i<30;i++)gems.push({x:e.x+(Math.random()-.5)*40,y:e.y+(Math.random()-.5)*40,v:5});bossPhase=3;SND.bgm('bgm_floor');SND.play('se_lvup',0.6);stairs={x:15*T+8,y:15*T+8};boss=null;chests.push({x:15*T+8,y:11*T+8});
   if(bossView){playAnim(bossView,'Death',true);const bv=bossView;setTimeout(()=>{scene.remove(bv.obj)},2500);bossView=null}
   fx.push({type:'text',txt:'撃破！エレベーターが出現',life:3});hz.length=0;for(const b of bullets)if(b.enemy)b.life=0}
  else{if(e.beh==='split'&&!e.child)for(let i=0;i<2;i++){const c=spawnEnemy(e.x+(i?6:-6),e.y,e.t.idx,true);if(c){c.hp=c.mhp=e.mhp*0.35;c.sc=0.7;c.child=1;c.kx=(i?40:-40)}}gems.push({x:e.x,y:e.y,v:e.xp});if(Math.random()<0.015)gems.push({x:e.x,y:e.y,heal:1})}}}
function nearestEnemy(r){let best=null,bd=r*r;near(P.x,P.y,r,e=>{const d=(e.x-P.x)**2+(e.y-P.y)**2;if(d<bd){bd=d;best=e}});return best}
function fireWeapons(dt){const haste=Math.pow(0.92,stat('haste'));
 for(const k in P.w){const L=P.w[k];P.cd[k]=(P.cd[k]||0)-dt;
  if(k==='orb'){P.orbA+=dt*(2.5+L*0.3);continue}
  if(k==='aura'){if(P.cd[k]<=0){P.cd[k]=0.5;const R=(26+L*5)*areaMul();near(P.x,P.y,R,e=>{if((e.x-P.x)**2+(e.y-P.y)**2<R*R)hurt(e,3+L*2,0,0,'aura')})}continue}
  if(P.cd[k]>0)continue;
  if(k==='chain'){P.cd[k]=Math.max(0.6,1.6-L*0.12)*haste;let t=nearestEnemy(130);if(!t){P.cd[k]=0.2;continue}const hit=new Set();let px=P.x,py=P.y;
   for(let j=0;j<3+L&&t;j++){hit.add(t);fx.push({type:'zap',x:px,y:py,x2:t.x,y2:t.y,life:0.15});hurt(t,10+L*5);px=t.x;py=t.y;let nb=null,bd=4900;near(px,py,70,e=>{if(!hit.has(e)&&e.hp>0){const d=(e.x-px)**2+(e.y-py)**2;if(d<bd){bd=d;nb=e}}});t=nb}continue}
  if(k==='laser'){P.cd[k]=Math.max(0.8,2.2-L*0.15)*haste;const t=nearestEnemy(160);const a=t?Math.atan2(t.y-P.y,t.x-P.x):Math.atan2(P.dy,P.dx);const c=Math.cos(a),sn=Math.sin(a),Ln=220,W=(5+L)*areaMul();
   fx.push({type:'beam',x:P.x,y:P.y,a,l:Ln,w:W,life:0.2});for(let st_=0;st_<Ln;st_+=GS){near(P.x+c*st_,P.y+sn*st_,GS,e=>{if(e._lz===time)return;const rx=e.x-P.x,ry=e.y-P.y,pr=rx*c+ry*sn,pd=Math.abs(-rx*sn+ry*c);if(pr>0&&pr<Ln&&pd<W+e.r){e._lz=time;hurt(e,18+L*8)}})}continue}
  if(k==='fam'){if(!P.fam)P.fam={x:P.x,y:P.y};P.fam.x+=(P.x-20*P.face-P.fam.x)*Math.min(1,dt*3);P.fam.y+=(P.y-14-P.fam.y)*Math.min(1,dt*3);
   if(P.cd[k]>0)continue;P.cd[k]=Math.max(0.25,0.8-L*0.08)*haste;let best=null,bd=150*150;near(P.fam.x,P.fam.y,150,e=>{const d=(e.x-P.fam.x)**2+(e.y-P.fam.y)**2;if(d<bd){bd=d;best=e}});if(!best){P.cd[k]=0.1;continue}
   const a=Math.atan2(best.y-P.fam.y,best.x-P.fam.x);bullets.push({k:'bolt',x:P.fam.x,y:P.fam.y,vx:Math.cos(a)*200,vy:Math.sin(a)*200,life:1,d:7+L*3,pierce:1+(L>>1),r:3,fam:1});continue}
  if(k==='bolt'){P.cd[k]=Math.max(0.15,0.9-L*0.07)*haste;const t=nearestEnemy(160);if(!t){P.cd[k]=0.1;continue}
   const n=1+Math.floor(L/2);for(let i=0;i<n;i++){const a=Math.atan2(t.y-P.y,t.x-P.x)+(i-(n-1)/2)*0.15;bullets.push({k,x:P.x,y:P.y,vx:Math.cos(a)*180,vy:Math.sin(a)*180,life:1.2,d:8+L*3,pierce:L>=5?2:1,r:3})}}
  if(k==='whip'){P.cd[k]=Math.max(0.5,1.4-L*0.1)*haste;const W=(40+L*6)*areaMul(),dirs=L>=3?[1,-1]:[P.face];
   for(const s of dirs){fx.push({type:'whip',x:P.x,y:P.y,s,w:W,life:0.18});near(P.x+s*W/2,P.y,W,e=>{if(Math.abs(e.y-P.y)<12*areaMul()&&(e.x-P.x)*s>-4&&(e.x-P.x)*s<W)hurt(e,12+L*5,s*30,0)})}}
  if(k==='axe'){P.cd[k]=Math.max(0.7,2-L*0.15)*haste;const n=1+Math.floor(L/3);for(let i=0;i<n;i++)bullets.push({k,x:P.x,y:P.y,vx:(Math.random()-.5)*120,vy:-200,g:400,life:2,d:20+L*8,pierce:99,r:6,hitset:new Set(),rot:0})}
  if(k==='bomb'){P.cd[k]=Math.max(0.8,2.5-L*0.2)*haste;const n=1+Math.floor(L/2);for(let i=0;i<n;i++){const t=enemies[(Math.random()*enemies.length)|0];const ok=t&&Math.hypot(t.x-P.x,t.y-P.y)<150;const bx=ok?t.x:P.x+(Math.random()-.5)*120,by=ok?t.y:P.y+(Math.random()-.5)*160;
   const R=(22+L*3)*areaMul();fx.push({type:'boom',x:bx,y:by,r:R,life:0.3});near(bx,by,R,e=>{if((e.x-bx)**2+(e.y-by)**2<R*R)hurt(e,15+L*6)})}}}
 if(P.w.orb){const L=P.w.orb,n=1+L,R=(28+L*2)*areaMul();P.cd.orbHit=(P.cd.orbHit||0)-dt;if(P.cd.orbHit<=0){P.cd.orbHit=0.25;
  for(let i=0;i<n;i++){const a=P.orbA+i*Math.PI*2/n,ox=P.x+Math.cos(a)*R,oy=P.y+Math.sin(a)*R;near(ox,oy,10,e=>{if((e.x-ox)**2+(e.y-oy)**2<100)hurt(e,6+L*3,Math.cos(a)*20,Math.sin(a)*20)})}}}}
// ================= level up / chest =================
let pendingLv=0;
function gainXP(v){P.xp+=v*(1+0.5*(P.sp.dblxp||0));while(P.xp>=P.nx){P.xp-=P.nx;P.lv++;P.nx=Math.floor(5+P.lv*4+P.lv*P.lv*0.3);pendingLv++}}
function openChest(){const pool=Object.keys(SPEC).filter(k=>((SPEC[k].w?P.w[k]:P.sp[k])||0)<5);let k=pool[(Math.random()*pool.length)|0],D,lvTxt;
 if(!k){P.mhp+=20;P.hp=P.mhp;D={n:'生命の秘薬',d:'最大HP+20・全回復'};lvTxt=''}else{D=SPEC[k];const tgt=D.w?P.w:P.sp;tgt[k]=(tgt[k]||0)+1;lvTxt=tgt[k]>1?' Lv'+tgt[k]:' NEW'}
 SND.play('se_chest',0.7);SND.play('se_item',0.5);$('treName').textContent='★'+D.n+lvTxt;$('treDesc').textContent=D.d+'（宝箱限定）';state='tre';$('tre').classList.add('on');save()}
function showLevel(){state='lvl';SND.play('se_lvup',0.5);const pool=[];for(const k in WDEF){const L=P.w[k]||0;if(L<8&&(L>0||Object.keys(P.w).filter(x=>WDEF[x]).length<5))pool.push({k,w:1,L})}for(const k in STATS)if(stat(k)<6)pool.push({k,w:0,L:stat(k)});
 pool.sort(()=>Math.random()-.5);const ch=$('choices');ch.innerHTML='';
 for(const o of pool.slice(0,3)){const b=document.createElement('button');b.className='card';const D=o.w?WDEF[o.k]:STATS[o.k];
  b.innerHTML=`<b>${D.n}</b> ${o.L?'Lv'+(o.L+1):(o.w?'<span style="color:#7f7">NEW</span>':'')}<br>${D.d}${o.w&&o.L?'（強化）':''}`;
  tap(b,()=>{if(state!=='lvl')return;if(o.w)P.w[o.k]=o.L+1;else{P.st[o.k]=o.L+1;if(o.k==='maxhp'){P.mhp+=20;P.hp=P.mhp}}pendingLv--;$('lvl').classList.remove('on');if(pendingLv>0)showLevel();else{state='play';last=performance.now()}save()});ch.appendChild(b)}
 $('lvl').classList.add('on')}
// ================= update =================
function moveCirc(o,dx,dy,r){let nx=o.x+dx;if(!solid(((nx+Math.sign(dx)*r)/T)|0,((o.y-r+1)/T)|0)&&!solid(((nx+Math.sign(dx)*r)/T)|0,((o.y+r-1)/T)|0))o.x=nx;
 let ny=o.y+dy;if(!solid(((o.x-r+1)/T)|0,((ny+Math.sign(dy)*r)/T)|0)&&!solid(((o.x+r-1)/T)|0,((ny+Math.sign(dy)*r)/T)|0))o.y=ny}
const MAXE_SWARM=170,MAXE_BOSS=90,MAXE_FLOOR=90;
function update(dt){time+=dt;
 let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 if(joy){const dx=joy.x-joy.sx,dy=joy.y-joy.sy,l=Math.hypot(dx,dy);if(l>6){const m=Math.min(1,l/50);mx=dx/l*m;my=dy/l*m}}
 const ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml}const spd=70*(1+0.1*stat('speed'));if(mx)P.face=Math.sign(mx);if(ml>0.05){P.dx=mx;P.dy=my}
 moveCirc(P,mx*spd*dt,my*spd*dt,4);P.moving=ml>0.05;
 if(stat('regen'))P.hp=Math.min(P.mhp,P.hp+0.5*stat('regen')*dt);P.inv-=dt;
 if(bossPhase===1){bossTimer-=dt;spawnT-=dt;const rate=Math.max(0.12,0.6-(180-bossTimer)/180*0.4-floor*0.01);
  if(spawnT<=0&&enemies.length<MAXE_SWARM){spawnT=rate*1.6;const n=1+Math.floor((180-bossTimer)/45);for(let i=0;i<n;i++){const a=Math.random()*6.28;let x=P.x+Math.cos(a)*150,y=P.y+Math.sin(a)*200;x=Math.max(3*T,Math.min((MW-3)*T,x));y=Math.max(3*T,Math.min((MH-3)*T,y));const e=spawnEnemy(x,y);if(e){e.hp*=1.5;e.mhp*=1.5}}}
  if(bossTimer<=0){bossTimer=0;spawnBoss()}}
 else if(bossPhase===2){spawnT-=dt;if(spawnT<=0&&enemies.length<MAXE_BOSS){spawnT=boss&&boss.ph===2?0.8:1.2;const a=Math.random()*6.28;spawnEnemy(Math.max(3*T,Math.min((MW-3)*T,P.x+Math.cos(a)*150)),Math.max(3*T,Math.min((MH-3)*T,P.y+Math.sin(a)*190)))}}
 else if(bossPhase===0){spawnT-=dt;if(spawnT<=0&&enemies.length<MAXE_FLOOR){spawnT=Math.max(1,4-floor*0.1);for(let i=0;i<3;i++){const a=Math.random()*6.28,x=P.x+Math.cos(a)*170,y=P.y+Math.sin(a)*210;spawnEnemy(x,y)}}}
 if(bossPhase===1)dpsT+=dt;updFood(dt);updHz(dt);buildGrid();fireWeapons(dt);
 for(const e of enemies){const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1;e.hit-=dt;
  if(d>400&&!e.isBoss)continue;
  let [vx,vy]=e.isBoss?[0,0]:behMove(e,dt,d,dx,dy);
  if(e.isBoss){const m=bossAI(e,dt,d,dx,dy);vx=m[0];vy=m[1]}
  near(e.x,e.y,10,o=>{if(o!==e){const sx=e.x-o.x,sy=e.y-o.y,sd=sx*sx+sy*sy;if(sd<64&&sd>0.01){const s=1/Math.sqrt(sd);vx+=sx*s*25;vy+=sy*s*25}}});
  vx+=e.kx*8;vy+=e.ky*8;e.kx*=0.85;e.ky*=0.85;
  if(e.isBoss){if(e.ai&&e.ai.st!=='walk'){vx=e.mvx||0;vy=e.mvy||0}e.x+=vx*dt;e.y+=vy*dt;e.x=Math.max(3*T,Math.min((MW-3)*T,e.x));e.y=Math.max(3*T,Math.min((MH-3)*T,e.y))}else moveCirc(e,vx*dt,vy*dt,3);
  if(d<e.r+4&&P.inv<=0&&!(e.ai&&e.ai.st==='leap')){if(P.sp.thorns)hurt(e,15*P.sp.thorns+(e.isBoss?0:e.mhp*0.05*P.sp.thorns));P.hp-=e.dmg;P.inv=0.5;SND.play('se_hurt',0.5);fx.push({type:'flash',life:0.15})}}
 for(let i=enemies.length-1;i>=0;i--)if(enemies[i].hp<=0){relView(enemies[i]);enemies[i]=enemies[enemies.length-1];enemies.pop()}
 for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.life-=dt;if(b.g)b.vy+=b.g*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.rot!==undefined)b.rot+=dt*12;
  if(b.enemy){if((b.x-P.x)**2+(b.y-P.y)**2<36&&P.inv<=0){P.hp-=b.d;P.inv=0.5;SND.play('se_hurt',0.5);b.life=0}}
  else{if(b.k==='bolt'&&solid((b.x/T)|0,(b.y/T)|0))b.life=0;
   near(b.x,b.y,b.r+12,e=>{if(b.life<=0||e.hp<=0)return;if((e.x-b.x)**2+(e.y-b.y)**2<(b.r+e.r)**2){if(b.hitset){if(b.hitset.has(e))return;b.hitset.add(e)}hurt(e,b.d,b.vx*0.05,b.vy*0.05);if(--b.pierce<=0)b.life=0}})}
  if(b.life<=0){bullets[i]=bullets[bullets.length-1];bullets.pop()}}
 const mag=(24*(1+0.4*stat('magnet')))**2;
 for(let i=gems.length-1;i>=0;i--){const g=gems[i],dx=P.x-g.x,dy=P.y-g.y,d2=dx*dx+dy*dy;if(d2<mag||g.pull){g.pull=g.pull||1;const d=Math.sqrt(d2)||1;const gs=g.pull===2?Math.min(900,(g.gs=(g.gs||250)+dt*500)):200;g.x+=dx/d*gs*dt;g.y+=dy/d*gs*dt}
  if(d2<64){SND.play('se_xp',0.15,0.04);if(g.heal)P.hp=Math.min(P.mhp,P.hp+30);else gainXP(g.v);gems[i]=gems[gems.length-1];gems.pop()}}
 if(gems.length>400){let s=0;for(const g of gems.splice(0,100))s+=g.v||0;gems.push({x:P.x+20,y:P.y,v:s})}
 for(let i=fx.length-1;i>=0;i--){fx[i].life-=dt;if(fx[i].life<=0)fx.splice(i,1)}
 for(const c of chests)if(!c.open&&Math.hypot(P.x-c.x,P.y-c.y)<14){c.open=1;openChest();break}
 if(stairs&&Math.hypot(P.x-stairs.x,P.y-stairs.y)<10){SND.play('se_stairs',0.6);floor++;genFloor();fx.push({type:'text',txt:floor+'F '+shopOf(floor).n+(floor%5===0?' ボスフロア！3分耐えろ！':''),life:2.5})}
 if(P.hp<=0&&(P.sp.revive||0)>P.revUsed){P.revUsed++;P.hp=P.mhp*0.5;P.inv=2;fx.push({type:'text',txt:'不死鳥の羽で復活！',life:2});near(P.x,P.y,80,e=>hurt(e,50))}
 if(P.hp<=0){P.hp=0;state='dead';$('dead').classList.add('on');showBtns(false)}
 if(pendingLv>0&&state==='play')showLevel();
}
// ================= render =================
const GEMC=[new THREE.Color(0x40e0ff),new THREE.Color(0x50ff60),new THREE.Color(0xff50c0)],GOLD=new THREE.Color(2.2,1.7,0.5),WHITE3=new THREE.Color(3,3,3),ONE=new THREE.Color(1,1,1);
const tmpV=new THREE.Vector3();
function W(x){return x*K}
function project(x,y,h){tmpV.set(x*K,h||0,y*K).project(camera);return [(tmpV.x+1)/2*innerWidth,(1-tmpV.y)/2*innerHeight,tmpV.z<1]}
let camT=new THREE.Vector3();
function render(dt){const px=W(P.x),pz=W(P.y);camT.lerp(_v.set(px,0,pz),Math.min(1,dt*10));if(camT.distanceTo(_v)>6)camT.copy(_v);
 camera.position.set(camT.x,18,camT.z+14);camera.lookAt(camT.x,0,camT.z+1.0);sun.position.set(camT.x-8,20,camT.z+10);sun.target.position.set(camT.x,0,camT.z);
 primBegin();for(const k in IM)IM[k].begin();
 // player
 if(playerView){const o=playerView.obj;o.position.set(px,0,pz);const tr=Math.atan2(P.dx,P.dy);let dr=tr-o.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));o.rotation.y+=dr*Math.min(1,dt*14);
  o.visible=P.inv<=0||((time*20)|0)%2===0||state!=='play';playAnim(playerView,state==='dead'?'Death_A':P.moving?'Running_A':'Idle',state==='dead');playerView.mixer&&playerView.mixer.update(dt*(state==='play'?SPD:1));}
 IM.shadow.put(mtx(px,0.03,pz,0,0.7));
 // familiar
 if(P.fam&&famView){famView.obj.visible=true;famView.obj.position.set(W(P.fam.x),1.2+Math.sin(time*4)*0.2,W(P.fam.y));famView.obj.rotation.y=Math.atan2(P.dx,P.dy);famView.mixer&&famView.mixer.update(dt)}else if(famView)famView.obj.visible=false;
 if(P.fam&&!famView){famView=makeView('e_Ghost','Flying_Idle');famView.obj.scale.setScalar(0.55);tint(famView,0.3,0.3,0.1)}
 // enemies
 const vis2=280*280;
 for(const e of enemies){if(e.isBoss)continue;const dx=e.x-P.x,dy=e.y-P.y,d2=dx*dx+dy*dy,vis=d2<vis2;const ex=W(e.x),ez=W(e.y),ry=Math.atan2(-dx,-dy);
  const esc=e.sc||1;if(vis&&e.beh){const bc=e.beh==='explode'&&e.fuse>0?((time*12|0)%2?0xffffff:0xff2020):BEHC[e.beh];prim('ring',ex,ez,0.05,0.8*esc,0.8*esc,0,bc,0.85);if(e.beh==='shield')prim('ring',ex,ez,0.9,1.0*esc,1.0*esc,0,0x60b0ff,0.6)}
  if(e.t.food){if(!vis)continue;const b=Math.abs(Math.sin(time*8+e.ph0));IM['f_'+e.t.food].put(mtx(ex,b*0.5,ez,ry+Math.sin(time*6+e.ph0)*0.3,1.4*esc*(1+0.15*(1-b)),1.4*esc*(0.85+0.3*b),1.4*esc*(1+0.15*(1-b))),e.hit>0||e.fuse>0&&(time*12|0)%2?WHITE3:ONE);IM.shadow.put(mtx(ex,0.03,ez,0,0.5));continue}
  if(!vis){if(e.view)relView(e);continue}
  if(!e.view)e.view=getView(e.t);const o=e.view.obj;o.position.set(ex,0,ez);o.rotation.y=ry;o.scale.setScalar(esc);const fl=e.hit>0?0.9:0,fr=e.fuse>0&&(time*12|0)%2?1:fl;tint(e.view,fr,fl,fl);if(e.view.mixer)e.view.mixer.update(dt*(state==='play'?SPD:0));IM.shadow.put(mtx(ex,0.03,ez,0,0.55))}
 // boss
 if(boss&&bossView){const e=boss,a=e.ai;let x=e.x,y=e.y,h=0;if(a&&a.st==='leap'&&!a.f){const t=Math.min(1,a.t/1.1);x=a.sx+(a.tx-a.sx)*t;y=a.sy+(a.ty-a.sy)*t;h=Math.sin(t*Math.PI)*9}
  const o=bossView.obj;o.position.set(W(x),h,W(y));const dx=P.x-x,dy=P.y-y;o.rotation.y=Math.atan2(dx,dy)+(a&&a.st==='spin'&&a.t>0.6?time*20:0);
  const an=!a||a.st==='walk'||a.st==='summon'||a.st==='meteor'?'Walk':a.st==='charge'?(a.t<0.8?'Idle':'Run'):a.st==='leap'?'Jump':a.st==='spin'?'Weapon':'Punch';playAnim(bossView,an);
  if(e.hit>0)tint(bossView,0.8,0.8,0.8);else if(e.ph===2)tint(bossView,0.35+0.25*Math.sin(time*10),0,0);else tint(bossView,0,0,0);bossView.mixer&&bossView.mixer.update(dt*(state==='play'?SPD:0));
  IM.shadow.put(mtx(W(x),0.03,W(y),0,W(e.r)*1.3))}else if(bossView&&bossView.mixer)bossView.mixer.update(dt);
 if(FOODC){const F=FOODC,fs=1.4/fsize(F.name),hop=Math.abs(Math.sin(time*7))*0.8;foodIM(F.name).put(mtx(W(F.x),0.3+hop,W(F.y),time*3,fs));prim('ring',W(F.x),W(F.y),0.06,1.1+Math.sin(time*6)*0.15,1.1+Math.sin(time*6)*0.15,0,0xff70c0,0.9);prim('disc',W(F.x),W(F.y),0.05,0.9,0.9,0,0xffffff,0.25);IM.shadow.put(mtx(W(F.x),0.03,W(F.y),0,0.5))}
 // gems
 for(const g of gems){const s=Math.sin(time*5+g.x)*0.15;if(g.heal)IM.burger.put(mtx(W(g.x),0.2+s,W(g.y),time*2,0.6));else IM.gem.put(mtx(W(g.x),0.45+s,W(g.y),time*3,1,1.3,1),GEMC[g.v>=5?2:g.v>=2?1:0])}
 // bullets
 for(const b of bullets){if(b.food){const fs=0.9/fsize(b.food);foodIM(b.food).put(mtx(W(b.x),0.9,W(b.y),time*8,fs));IM.eb.put(mtx(W(b.x),0.9,W(b.y),0,0.5))}else if(b.enemy)IM.eb.put(mtx(W(b.x),0.9,W(b.y)));else if(b.k==='axe'){_e.set(b.rot,Math.atan2(b.vx,b.vy),0);_q.setFromEuler(_e);IM.knife.put(new THREE.Matrix4().compose(_v.set(W(b.x),1,W(b.y)),_q,_s.set(1.6,1.6,1.6)))}else IM.bolt.put(mtx(W(b.x),0.9,W(b.y)),b.fam?GEMC[2]:ONE)}
 // orbs
 if(P.w.orb){const L=P.w.orb,n=1+L,R=(28+L*2)*areaMul();for(let i=0;i<n;i++){const a=P.orbA+i*Math.PI*2/n;IM.plate.put(mtx(W(P.x+Math.cos(a)*R),0.8,W(P.y+Math.sin(a)*R),a*3,1.3))}}
 if(P.w.aura){const R=(26+P.w.aura*5)*areaMul();prim('disc',px,pz,0.06,W(R),W(R),0,0xfff080,0.18+0.06*Math.sin(time*6));prim('ring',px,pz,0.07,W(R),W(R),0,0xffe060,0.5)}
 // chests
 for(const c of chests){IM.pot.put(mtx(W(c.x),0,W(c.y),0,1.1),GOLD);if(!c.open){IM.lid.put(mtx(W(c.x),1.15+Math.abs(Math.sin(time*3))*0.12,W(c.y),time,1.1),GOLD);prim('ring',W(c.x),W(c.y),0.05,1.6+Math.sin(time*4)*0.2,1.6+Math.sin(time*4)*0.2,0,0xffc040,0.8)}}
 // elevator
 if(elevator){elevator.visible=!!stairs;if(stairs){elevator.position.set(W(stairs.x),0,W(stairs.y));elevator.userData.arr.position.y=2.4+Math.sin(time*4)*0.3;elevator.userData.arr.rotation.y=time*2}}
 // hazards
 for(const h of hz){const p=Math.min(1,h.t/h.warn);
  if(h.k==='c'||h.k==='ring'){prim('ring',W(h.x),W(h.y),0.08,W(h.r),W(h.r),0,0xff2828,0.9);prim('disc',W(h.x),W(h.y),0.07,W(h.r*p),W(h.r*p),0,0xff2828,0.25+0.25*p);if(h.met){const hh=(1-p)*14;IM.eb.put(mtx(W(h.x),hh,W(h.y),0,3))}}
  else{if(h.sweep&&h.t>1){prim('rect',W(h.x),W(h.y),1.0,W(h.len),W(10),-h.a,0xff50ff,0.85);prim('rect',W(h.x),W(h.y),1.02,W(h.len),W(4),-h.a,0xffffff,0.9)}else{const m=prim('rect',W(h.x),W(h.y),0.07,W(h.len),W(h.w),-h.a,0xff2828,0.2+0.3*p);m.position.x-=0;}}}
 // fx
 for(const f of fx){if(f.type==='whip'){const t=1-f.life/0.18;prim('rect',px,pz,0.9,W(f.w),W(8),f.s>0?0:Math.PI,0xffffff,f.life*4);IM.pan.put(mtx(px+f.s*W(f.w)*Math.min(1,t*1.3),0.9,pz,f.s>0?-Math.PI/2:Math.PI/2,1.4))}
  else if(f.type==='zap'){const dx=f.x2-f.x,dy=f.y2-f.y;prim('rect',W(f.x),W(f.y),1.0,W(Math.hypot(dx,dy)),0.25,-Math.atan2(dy,dx),0xffff80,0.95)}
  else if(f.type==='beam'){prim('rect',W(f.x),W(f.y),1.0,W(f.l),W(f.w),-f.a,0xffffc8,f.life*4)}
  else if(f.type==='boom'){const r=W(f.r)*(1.2-f.life);prim('disc',W(f.x),W(f.y),0.1,r,r,0,0xff8c1e,Math.min(0.9,f.life*2.5))}
  else if(f.type==='catch'){const t=0.8-f.life;for(let i=0;i<3;i++){const r=0.5+t*(8+i*4);prim('ring',W(f.x),W(f.y),0.2+i*0.1,r,r,0,[0xffe060,0xff70c0,0x80ffff][i],f.life)}}
  else if(f.type==='summon'){const r=0.5+(0.5-f.life)*5;prim('ring',W(f.x),W(f.y),0.15,r,r,0,0xc060ff,f.life*2)}
  else if(f.type==='poof'){const r=0.4+(0.3-f.life)*4;prim('ring',W(f.x),W(f.y),0.3,r,r,0,0xffffff,f.life*3)}}
 for(const k in IM)IM[k].end();primEnd();
 renderer.render(scene,camera);drawHUD()}
function drawHUD(){const w=innerWidth,h=innerHeight;hx.setTransform(DPR,0,0,DPR,0,0);hx.clearRect(0,0,w,h);if(!P||state==='title')return;
 const top=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat'))||0);
 hx.textAlign='center';hx.font='bold 13px sans-serif';
 for(const f of fx){if(f.type==='num'){const [sx,sy]=project(f.x,f.y,1.6);hx.fillStyle='#000';hx.fillText(f.txt,sx+1,sy-(0.5-f.life)*30+1);hx.fillStyle='#fff';hx.fillText(f.txt,sx,sy-(0.5-f.life)*30)}}
 let ty=h*0.3;for(const f of fx){if(f.type==='text'){hx.font='bold 20px sans-serif';hx.fillStyle='#000';hx.fillText(f.txt,w/2+2,ty+2);hx.fillStyle='#ffd84a';hx.fillText(f.txt,w/2,ty);ty+=28}else if(f.type==='flash'){hx.fillStyle='rgba(255,0,0,.22)';hx.fillRect(0,0,w,h)}}
 // offscreen markers
 const mark=(x,y,col)=>{const [sx,sy]=project(x,y,0.5);if(sx>10&&sx<w-10&&sy>60&&sy<h-10)return;const cx_=Math.max(14,Math.min(w-14,sx)),cy_=Math.max(70,Math.min(h-14,sy));hx.fillStyle=col;hx.beginPath();hx.arc(cx_,cy_,7,0,7);hx.fill();hx.strokeStyle='#000';hx.stroke()};
 for(const c of chests)if(!c.open)mark(c.x,c.y,'#ff9a20');if(FOODC)mark(FOODC.x,FOODC.y,'#ff70c0');if(stairs)mark(stairs.x,stairs.y,'#60ffff');
 if(joy){let dx=joy.x-joy.sx,dy=joy.y-joy.sy;const l=Math.hypot(dx,dy),m=50;if(l>m){dx*=m/l;dy*=m/l}hx.strokeStyle='rgba(255,255,255,.5)';hx.lineWidth=2;hx.beginPath();hx.arc(joy.sx,joy.sy,m,0,7);hx.stroke();hx.fillStyle='rgba(255,255,255,.45)';hx.beginPath();hx.arc(joy.sx+dx,joy.sy+dy,20,0,7);hx.fill()}
 hx.textAlign='left';hx.fillStyle='#222';hx.fillRect(0,0,w,6);hx.fillStyle='#4af';hx.fillRect(0,0,w*P.xp/P.nx,6);
 const y0=12+top;hx.fillStyle='#400';hx.fillRect(8,y0,130,12);hx.fillStyle='#e33';hx.fillRect(8,y0,130*Math.max(0,P.hp)/P.mhp,12);hx.strokeStyle='#fff';hx.lineWidth=1;hx.strokeRect(8,y0,130,12);
 hx.font='bold 13px sans-serif';hx.fillStyle='#fff';hx.fillText('HP '+Math.ceil(P.hp)+'/'+P.mhp,8,y0+28);hx.fillText('Lv'+P.lv+'  '+floor+'F',8,y0+46);
 hx.textAlign='center';
 if(bossPhase===1){const m=Math.floor(bossTimer/60),s=Math.floor(bossTimer%60);hx.font='bold 18px sans-serif';hx.fillStyle='#000';hx.fillText('ボス出現まで '+m+':'+String(s).padStart(2,'0'),w/2+1,y0+70+1);hx.fillStyle='#f66';hx.fillText('ボス出現まで '+m+':'+String(s).padStart(2,'0'),w/2,y0+70)}
 else if(boss){hx.fillStyle='#300';hx.fillRect(16,y0+56,w-32,12);hx.fillStyle=boss.ph===2?'#f22':'#c0f';hx.fillRect(16,y0+56,(w-32)*boss.hp/boss.mhp,12);hx.fillStyle='#fff';hx.fillRect(w/2,y0+54,2,16);hx.font='bold 14px sans-serif';hx.fillText(boss.bd.n+(boss.ph===2?'  ★第2形態':'  第1形態'),w/2,y0+86)}
 else{const t=Math.floor(time);hx.fillStyle='#ddd';hx.font='bold 14px sans-serif';hx.fillText(Math.floor(t/60)+':'+String(t%60).padStart(2,'0'),w/2,y0+12)}
 if(bossPhase===3){hx.font='bold 16px sans-serif';hx.fillStyle='#ffd84a';hx.fillText('中央のエレベーターで上の階へ！',w/2,y0+70)}}
// ================= loop =================
const SPDS=[1,1.5,2,3];let SPD=1;try{const v=parseFloat(localStorage.getItem('rsurv_spd'));if(SPDS.includes(v))SPD=v}catch(e){}
function spdLabel(){document.querySelectorAll('.spdB').forEach(b=>b.textContent='»'+SPD+'x')}
function cycleSpd(){SPD=SPDS[(SPDS.indexOf(SPD)+1)%SPDS.length];try{localStorage.setItem('rsurv_spd',String(SPD))}catch(e){}spdLabel()}
let last=performance.now();
function loop(now){requestAnimationFrame(loop);let dt=Math.min(0.05,(now-last)/1000);last=now;
 try{if(state==='play'){const acc=dt*SPD;const n=Math.min(8,Math.max(1,Math.ceil(acc/0.017)));for(let i=0;i<n&&state==='play';i++)update(acc/n)}
 if(P&&map)render(dt);else{renderer.render(scene,camera);hx.clearRect(0,0,hud.width,hud.height)}}catch(err){console.error(err);const d=$('err');d.style.display='block';d.textContent='エラー: '+err.message}}
requestAnimationFrame(loop);
// ================= audio =================
const SND=(()=>{let ctx=null,on=true,buf={},cur=null,curName='',want='';try{on=localStorage.getItem('rsurv_snd')!=='0'}catch(e){}
 const names=['bgm_title','bgm_floor','bgm_swarm','bgm_boss','se_hit','se_kill','se_xp','se_lvup','se_chest','se_hurt','se_stairs','se_boss','se_item'];const lastT={};
 function load(n){if(buf[n]!==undefined)return;buf[n]=null;fetch('assets/audio/'+n+'.mp3').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(a=>new Promise((ok,ng)=>ctx.decodeAudioData(a,ok,ng))).then(b=>{buf[n]=b;if(n===want&&curName!==n)bgm(n)}).catch(()=>{})}
 function unlock(){try{if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();names.forEach(load)}if(ctx.state==='suspended')ctx.resume().catch(()=>{});if(want&&curName!==want)bgm(want)}catch(e){}}
 function play(n,vol,gap){try{if(!on||!ctx||!buf[n])return;const t=ctx.currentTime;if(gap&&lastT[n]&&t-lastT[n]<gap)return;lastT[n]=t;const s=ctx.createBufferSource(),g=ctx.createGain();g.gain.value=vol||0.5;s.buffer=buf[n];s.connect(g).connect(ctx.destination);s.start()}catch(e){}}
 function stop(){try{if(cur){cur.s.stop();cur=null}}catch(e){cur=null}curName=''}
 function bgm(n){want=n;try{if(!ctx||!on){stop();return}if(curName===n)return;stop();if(!buf[n])return;const s=ctx.createBufferSource(),g=ctx.createGain();g.gain.value=0.35;s.buffer=buf[n];s.loop=true;s.connect(g).connect(ctx.destination);s.start();cur={s};curName=n}catch(e){}}
 function toggle(){on=!on;try{localStorage.setItem('rsurv_snd',on?'1':'0')}catch(e){}if(on){unlock();bgm(want)}else stop();label()}
 function label(){document.querySelectorAll('.bSnd').forEach(b=>b.textContent=on?'🔊 サウンド: ON':'🔇 サウンド: OFF')}
 ['pointerdown','touchend','keydown','click'].forEach(ev=>addEventListener(ev,unlock,{passive:true,capture:true}));
 return{play,bgm,toggle,label,get loaded(){return Object.keys(buf).filter(k=>buf[k]).length},get playing(){return curName}}})();
SND.label();SND.bgm('bgm_title');
function floorBgm(){SND.bgm(bossPhase===1?'bgm_swarm':bossPhase===2?'bgm_boss':'bgm_floor')}
// ================= UI =================
function showBtns(v){$('pause').style.display=v?'block':'none';$('spd').style.display=v?'block':'none'}
let inited=false;
function startGame(cont){if(state==='play'||!READY)return;if(!inited){inited=true;initIM();makeElevator()}
 const s=cont&&load();P=newPlayer();floor=1;if(s){floor=s.floor||1;Object.assign(P,s.P);P.w=P.w||{bolt:1};P.st=P.st||{};P.sp=P.sp||{};P.cd={}}pendingLv=0;
 if(!playerView)playerView=makeView('player','Idle');genFloor();camT.set(W(P.x),0,W(P.y));
 fx.push({type:'text',txt:floor+'F '+shopOf(floor).n+(floor%5===0?' ボスフロア！3分耐えろ！':''),life:2.5});
 $('title').classList.remove('on');showBtns(true);state='play';last=performance.now()}
function tap(el,fn){let t=0;const h=e=>{const n=Date.now();if(n-t<400)return;t=n;try{fn()}catch(err){console.error(err);const d=$('err');d.style.display='block';d.textContent='エラー: '+err.message}};el.addEventListener('click',h);el.addEventListener('touchend',e=>{h(e);if(e.cancelable)e.preventDefault()})}
tap($('bNew'),()=>startGame(false));tap($('bCont'),()=>startGame(true));
function togglePause(){if(state==='play'){state='pause';$('pz').classList.add('on')}else if(state==='pause'){state='play';$('pz').classList.remove('on');last=performance.now()}}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')togglePause()});
document.querySelectorAll('.bSnd').forEach(b=>tap(b,()=>SND.toggle()));tap($('bZk'),showZukan);tap($('bZk2'),showZukan);tap($('bZkX'),()=>$('zk').classList.remove('on'));tap($('bCred'),()=>$('cred').classList.add('on'));tap($('bCredX'),()=>$('cred').classList.remove('on'));
document.querySelectorAll('.spdB').forEach(b=>tap(b,cycleSpd));spdLabel();
tap($('bTre'),()=>{$('tre').classList.remove('on');state='play';last=performance.now()});tap($('pause'),togglePause);tap($('bRes'),togglePause);
tap($('bTitle'),()=>{save();$('pz').classList.remove('on');showBtns(false);state='title';SND.bgm('bgm_title');$('bCont').style.display='';$('title').classList.add('on')});
tap($('bRetry'),()=>{$('dead').classList.remove('on');if(playerView)playerView.cur=null;genFloor();fx.push({type:'text',txt:floor+'F 再挑戦！',life:2});showBtns(true);state='play';last=performance.now()});
// title backdrop
camera.position.set(0,10,14);camera.lookAt(0,0,0);
loadAll();
window.__dbg={get FOODC(){return FOODC},set foodT(v){foodT=v},get gems(){return gems},ZK,gainXP,get boss(){return boss},scene,THREE,camera,get pv(){return playerView},M,get P(){return P},get enemies(){return enemies},setFloor(f){floor=f;genFloor()},get state(){return state},SND,get SPD(){return SPD},get hz(){return hz},get chests(){return chests},get bossTimer(){return bossTimer},set bossTimer(v){bossTimer=v},get boss(){return boss},get READY(){return READY},openChest,get stairs(){return stairs},renderer,get floor(){return floor}};
