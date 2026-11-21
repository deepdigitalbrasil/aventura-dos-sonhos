/* Aventura dos Sonhos — jogo original, sem bibliotecas externas.
   Canvas 1280x720; tempo de jogo alvo: aproximadamente 3 minutos. */
(()=>{
'use strict';
const W=1280,H=720,TAU=Math.PI*2;
const $=s=>document.querySelector(s);
const canvas=$('#game'),ctx=canvas.getContext('2d',{alpha:false});
const fullscreenSurface=$('#fullscreenSurface'),fullscreenButton=$('#fullscreenToggle');
const embeddedAssets=window.GAME_EMBEDDED_ASSETS||{};
const screen=$('#screen'),menu=$('#menu'),dialog=$('#dialog'),hud=$('#hud'),toast=$('#toast');
const touchUI=$('#touchControls');
const heroKeys=['ben','liz'];
const images={};
for(const key of heroKeys) for(const pose of ['', '_dash','_shoot','_hurt','_float','_dive']){let im=new Image();im.src=embeddedAssets[key+pose]||`assets/${key}${pose}.png`;images[key+pose]=im;}
for(const name of ['boss_idle','boss_active','boss_angry','boss_candy','boss_hurt','boss_fury','boss_charge','boss_shield','boss_ray']) {let im=new Image(); im.src=embeddedAssets[name]||`assets/${name}.png`;images[name]=im;}
const rand=(a,b)=>Math.random()*(b-a)+a, clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t;
const dist2=(x,y,x2,y2)=>(x-x2)**2+(y-y2)**2;
const waveNames=['Nuvens sonolentas','Brilhos travessos','A dança dos docinhos','O céu das estrelinhas','A última tempestade'];
const foes=[{kind:'puff',name:'Nuvita',main:'#f9bdde',edge:'#ca79b6',life:38,r:30,score:100},
 {kind:'bee',name:'Abelhinha de bala',main:'#f9df78',edge:'#e7ad56',life:32,r:24,score:120},
 {kind:'bat',name:'Morceguinho mágico',main:'#b9a6f4',edge:'#766bbd',life:48,r:32,score:160},
 {kind:'jelly',name:'Geleia cósmica',main:'#93e5d6',edge:'#48b2b0',life:46,r:28,score:180},
 {kind:'star',name:'Estrelinha dançante',main:'#ffe48e',edge:'#eeaf60',life:44,r:26,score:180}];
// Cinco ondas de 22-26 s + chefão de aproximadamente 50-65 s = partida típica de ~3 minutos.
const diffSettings={easy:{duration:22,enemyHP:.74,enemySpeed:.80,spawn:1.75,damage:.65,bossHP:1450,regen:1.45},normal:{duration:24,enemyHP:1,enemySpeed:1,spawn:1.5,damage:1,bossHP:1850,regen:1},hard:{duration:26,enemyHP:1.25,enemySpeed:1.14,spawn:1.3,damage:1.25,bossHP:2250,regen:.9}};
const S={scene:'menu',hero:'ben',difficulty:'normal',cfg:diffSettings.normal,time:0,levelTime:0,wave:0,waveTime:0,score:0,kills:0,player:null,enemies:[],shots:[],badShots:[],particles:[],pickups:[],sparkles:[],boss:null,spawn:0,fire:0,specialCD:0,camera:0,shake:0,flash:0,wind:0,toastT:0,last:0,stars:[],pausedFrom:'playing',win:false};
const keys={};let pointer={active:false,x:220,y:355},soundOn=true,AC=null,lastMusicTime=0,musicStep=0,musicNext=0,screenIsTouch=matchMedia('(pointer:coarse)').matches;let fireTouch=false;

function makeStars(){for(let i=0;i<115;i++)S.stars.push({x:rand(0,W),y:rand(6,560),r:rand(.8,3.1),v:rand(8,27),ph:rand(0,TAU),col:['#fff7ba','#fff','#f7c4ee','#baf5fa'][i%4]});}
makeStars();
function setupAudio(){try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();musicNext=AC.currentTime+.15;}catch(_){soundOn=false;}}
function tone(hz,dur=.11,type='sine',vol=.045,slide=1){if(!soundOn||!AC||AC.state!=='running')return;let t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(hz,t);if(slide!==1)o.frequency.exponentialRampToValueAtTime(Math.max(50,hz*slide),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+dur+.01);}
function sound(kind){if(!soundOn)return;switch(kind){case 'shoot':tone(S.hero==='liz'?730:280,.07,S.hero==='liz'?'sine':'triangle',.018,1.35);break;case 'hit':tone(180,.12,'sawtooth',.028,.53);break;case 'pop':tone(440,.15,'triangle',.04,1.7);break;case 'special':tone(520,.48,'triangle',.065,2.2);tone(260,.35,'sine',.035,3);break;case 'hurt':tone(230,.3,'sawtooth',.065,.52);break;case 'pickup':tone(660,.18,'sine',.05,1.5);break;case 'boss':tone(125,.7,'triangle',.08,.6);break;case 'win':for(let i=0;i<4;i++)setTimeout(()=>tone([523,659,784,1047][i],.6,'triangle',.06),i*180);break;}}
function musicTick(){if(!AC||!soundOn||AC.state!=='running'||S.scene!=='playing')return;let now=AC.currentTime;if(now<musicNext)return;musicNext=now+.27;const seq=[392,494,587,784,0,587,494,392,440,523,659,880,0,659,523,440];let note=seq[musicStep%seq.length];if(note)tone(note,.23,'sine',.012);if(musicStep%4===0)tone([196,174,220,164][Math.floor(musicStep/4)%4],.52,'triangle',.010);musicStep++;}
function updateMute(){ $('#mute').textContent=soundOn?'🔊 Som ligado':'🔇 Som desligado'; }
$('#mute').onclick=()=>{soundOn=!soundOn;if(soundOn)setupAudio();updateMute();};
for(const btn of document.querySelectorAll('[data-hero]'))btn.onclick=()=>{S.hero=btn.dataset.hero;document.querySelectorAll('[data-hero]').forEach(b=>{let on=b===btn;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);});tone(550,.1);};
for(const btn of document.querySelectorAll('[data-diff]'))btn.onclick=()=>{S.difficulty=btn.dataset.diff;document.querySelectorAll('[data-diff]').forEach(b=>{let on=b===btn;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);});tone(630,.1);};
$('#start').onclick=startGame;
$('#pause').onclick=togglePause;
function isFullscreen(){return Boolean(document.fullscreenElement||document.webkitFullscreenElement);}
function syncFullscreen(){const active=isFullscreen();fullscreenButton.setAttribute('aria-pressed',String(active));fullscreenButton.setAttribute('aria-label',active?'Sair da tela cheia':'Entrar em tela cheia');fullscreenButton.title=active?'Sair da tela cheia (F)':'Ativar tela cheia (F)';fullscreenButton.querySelector('span').textContent=active?'Sair da tela cheia':'Tela cheia';fullscreenButton.querySelector('.fullscreen-icon').textContent=active?'⤢':'⛶';}
async function toggleFullscreen(){
 try{
  if(isFullscreen()){
   if(document.exitFullscreen)await document.exitFullscreen();
   else if(document.webkitExitFullscreen)document.webkitExitFullscreen();
  }else if(fullscreenSurface.requestFullscreen)await fullscreenSurface.requestFullscreen();
  else if(fullscreenSurface.webkitRequestFullscreen)fullscreenSurface.webkitRequestFullscreen();
  else announce('Tela cheia indisponível','No computador, experimente a tecla F11.');
 }catch(e){announce('Não foi possível abrir em tela cheia','No computador, experimente a tecla F11.');}
 syncFullscreen();
}
fullscreenButton.addEventListener('click',toggleFullscreen);
document.addEventListener('fullscreenchange',syncFullscreen);
document.addEventListener('webkitfullscreenchange',syncFullscreen);
syncFullscreen();
$('#touchSpecial').addEventListener('pointerdown',e=>{e.preventDefault();special();});
$('#touchFire').addEventListener('pointerdown',e=>{e.preventDefault();fireTouch=true;});
for(const evt of ['pointerup','pointercancel','pointerleave'])$('#touchFire').addEventListener(evt,()=>fireTouch=false);
window.addEventListener('keydown',e=>{let k=e.key.toLowerCase(); if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys[k]=true;if(k==='p'||(k==='escape'&&!isFullscreen())){if(!e.repeat)togglePause();}if(k==='f'&&!e.repeat&&e.target.tagName!=='BUTTON')toggleFullscreen(); if(k==='x'||k==='shift'){if(!e.repeat)special();}if(k==='enter'&&S.scene==='menu')startGame();});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
window.addEventListener('blur',()=>{if(S.scene==='playing')togglePause();});
function pointerPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
canvas.addEventListener('pointerdown',e=>{if(S.scene!=='playing')return;pointer.active=true;try{canvas.setPointerCapture(e.pointerId);}catch(_){}let p=pointerPos(e);pointer.x=p.x;pointer.y=p.y;});
canvas.addEventListener('pointermove',e=>{if(!pointer.active)return;let p=pointerPos(e);pointer.x=p.x;pointer.y=p.y;});
canvas.addEventListener('pointerup',()=>pointer.active=false);
canvas.addEventListener('pointercancel',()=>pointer.active=false);

function startGame(){setupAudio();S.scene='playing';S.cfg=diffSettings[S.difficulty];S.time=0;S.levelTime=0;S.wave=0;S.waveTime=0;S.score=0;S.kills=0;S.enemies=[];S.shots=[];S.badShots=[];S.particles=[];S.pickups=[];S.boss=null;S.spawn=2;S.fire=0;S.specialCD=0;S.shake=0;S.wind=0;S.flash=0;S.camera=0;S.win=false;fireTouch=false;pointer.active=false;menu.classList.remove('hidden');dialog.classList.add('hidden');$('#gameFrame').classList.add('playing-mode');S.player={x:215,y:366,vx:0,vy:0,hp:100,lives:3,invuln:2,slow:0,trail:0};screen.classList.add('hidden');hud.classList.remove('hidden');hud.setAttribute('aria-hidden','false');$('#bossBar').classList.add('hidden');touchUI.classList.toggle('hidden',!screenIsTouch);$('#hudPortrait').textContent=S.hero==='ben'?'🐉':'🦄';$('#heroName').textContent=S.hero.toUpperCase();announce('ONDA 1 · NUVENS SONOLENTAS','Os sonhos precisam de você!');updateHUD();}
function showDialog(title,desc,emoji,buttons){S.scene='dialog';screen.classList.remove('hidden');menu.classList.add('hidden');dialog.classList.remove('hidden');dialog.innerHTML=`<div class="illustration">${emoji}</div><h2>${title}</h2><p>${desc}</p><div class="dialog-actions"></div>`;let a=dialog.querySelector('.dialog-actions');for(let b of buttons){let btn=document.createElement('button');btn.textContent=b.label;btn.className=b.alt?'alt':'';btn.onclick=b.action;a.appendChild(btn);}touchUI.classList.add('hidden');}
function menuScreen(){S.scene='menu';$('#gameFrame').classList.remove('playing-mode');screen.classList.remove('hidden');menu.classList.remove('hidden');dialog.classList.add('hidden');hud.classList.add('hidden');touchUI.classList.add('hidden');S.boss=null;}
function togglePause(){if(S.scene==='playing'){S.scene='paused';showDialog('JOGO PAUSADO','Os sonhos podem esperar um pouquinho! 🌙','⏸️',[{label:'▶ CONTINUAR',action:resume},{label:'⌂ MENU',alt:true,action:menuScreen}]);S.scene='paused';} else if(S.scene==='paused')resume();}
function resume(){S.scene='playing';screen.classList.add('hidden');dialog.classList.add('hidden');touchUI.classList.toggle('hidden',!screenIsTouch);S.last=performance.now();}
function announce(main,sub=''){toast.innerHTML=`${main}${sub?`<div style="font-size:13px;font-weight:800;margin-top:3px">${sub}</div>`:''}`;toast.classList.remove('hidden');S.toastT=3.1;}
function addParticle(x,y,col,n=8,spread=1){for(let i=0;i<n;i++){let ang=rand(0,TAU),sp=rand(35,230)*spread,life=rand(.30,.95);S.particles.push({x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life,max:life,r:rand(2.5,8),col,rot:rand(0,TAU),type:Math.random()<.22?'star':'dot'});}if(S.particles.length>400)S.particles.splice(0,S.particles.length-400);}
function playerShoot(){let p=S.player;if(!p)return;let x=p.x+85,y=p.y+10;let col=S.hero==='ben'?'#ffb84e':'#ff82cb';S.shots.push({x,y,vx:S.hero==='ben'?710:900,vy:0,r:S.hero==='ben'?12:9,damage:S.hero==='ben'?20:17,col,life:1.8,kind:S.hero==='ben'?'flame':'rainbow',special:false});addParticle(x,y,col,2,.35);sound('shoot');}
function special(){if(S.scene!=='playing'||S.specialCD>0||!S.player)return;S.specialCD=S.hero==='ben'?12.5:14;let p=S.player;if(S.hero==='ben') {for(let i=-1;i<=1;i++)S.shots.push({x:p.x+88,y:p.y+6+i*24,vx:540,vy:i*185,r:23,damage:125,col:'#ff8547',life:2.8,kind:'meteor',special:true});addParticle(p.x+100,p.y,'#ffe888',38,1.5);}else {S.shots.push({x:p.x+89,y:p.y-15,vx:530,vy:0,r:29,damage:155,col:'#ff89d7',life:2.3,kind:'bomb',special:true});addParticle(p.x+92,p.y,'#98ffe9',35,1.4);}S.shake=7;sound('special');announce(S.hero==='ben'?'🔥 TRIPLO METEORO!':'🌈 BOMBA DE CORES!');}
function spawnEnemy(){let available=Math.min(foes.length,2+Math.floor(S.wave*.85)),types=foes.slice(0,available),type=types[Math.floor(rand(0,types.length))],y=rand(145,625);let group=Math.random()<.22?3:1;for(let i=0;i<group;i++){let f=type;S.enemies.push({x:W+50+i*88,y:y+(i-1)*(group>1?65:0),base:y+(i-1)*(group>1?65:0),vx:-(125+S.wave*15+rand(0,30))*S.cfg.enemySpeed,phase:rand(0,TAU),time:0,hp:f.life*S.cfg.enemyHP,maxHP:f.life*S.cfg.enemyHP,type:f,shot:rand(1.2,3.2),mode:Math.floor(rand(0,3)),r:f.r,size:rand(.87,1.12),hit:0});}}
function enemyFire(e){const aim=Math.atan2(S.player.y-e.y,S.player.x-e.x);let speed=(125+S.wave*13)*S.cfg.enemySpeed;S.badShots.push({x:e.x-25,y:e.y,vx:Math.cos(aim)*speed,vy:Math.sin(aim)*speed,r:10,life:8,col:e.type.kind==='jelly'?'#7ce5da':'#f2a8e3',kind:'dot',damage:15});}
function spawnPickup(x,y){S.pickups.push({x,y,vx:-68,y0:y,t:0,r:19,kind:Math.random()<.63?'heart':'star'});}
function hurt(amount,slow=0){let p=S.player;if(!p||p.invuln>0)return;p.hp-=amount*S.cfg.damage;p.invuln=1.45;p.slow=Math.max(p.slow,slow);S.shake=8;S.flash=.18;addParticle(p.x,p.y,'#ffe6ff',23,1.2);sound('hurt');if(p.hp<=0){p.lives--;if(p.lives>0){p.hp=100;p.invuln=3.6;// Marcar para remoção, sem substituir o array que está sendo percorrido.
 for(const b of S.badShots)if(dist2(b.x,b.y,p.x,p.y)<=180**2)b.remove=true;announce(`💖 MAIS ${p.lives} ${p.lives===1?'VIDA!':'VIDAS!'}`,'Você consegue!');}else{gameOver();}}}
function gameOver(){sound('hurt');showDialog('TENTE MAIS UMA VEZ!','Os sonhos ainda precisam de você! Cada tentativa é uma nova aventura. ✨','🌈',[{label:'↻ JOGAR NOVAMENTE',action:startGame},{label:'⌂ MENU',alt:true,action:menuScreen}]);}
function winGame(){if(S.scene==='victory')return;S.scene='victory';S.win=true;S.shake=16;for(let i=0;i<130;i++)addParticle(rand(190,1180),rand(120,560),['#fff49d','#ff96c9','#9bf5ed','#c9b5ff'][i%4],1,.28);sound('win');let minutes=Math.floor(S.levelTime/60),seconds=Math.floor(S.levelTime%60);setTimeout(()=>{if(S.scene!=='victory')return;showDialog('SONHOS SALVOS!','Parabéns, '+(S.hero==='ben'?'Ben':'Liz')+'! O Barão virou um ursinho fofinho, e as cores voltaram ao céu!<br><br>⭐ Pontuação: <b>'+S.score.toLocaleString('pt-BR')+'</b> · ⏱ '+minutes+':'+String(seconds).padStart(2,'0')+' · 💗 '+S.player.lives+' vidas restantes','🏆🌈',[{label:'↻ NOVA AVENTURA',action:startGame},{label:'⌂ ESCOLHER HERÓI',alt:true,action:menuScreen}]);},1900);}
function beginBoss(){S.boss={x:1100,y:352,hp:S.cfg.bossHP,maxHP:S.cfg.bossHP,phase:1,time:0,fire:1.1,attackClock:0,candy:3,beam:0,beamY:350,charge:0,shield:0,invuln:0,glow:0,defeated:false};S.enemies=[];S.badShots=[];S.pickups=[];S.shots=[];S.wind=0;sound('boss');announce('💜 CHEGOU O BARÃO!','Encontre o cristal no peito do vilão!');$('#bossBar').classList.remove('hidden');}
function bossDamage(dmg,x,y){let b=S.boss;if(!b||b.defeated)return;if(b.phase===3&&b.shield>0){let ang=Math.atan2(y-(b.y+40),x-(b.x-30)),opening=Math.atan2(Math.sin(b.time*2.8),Math.cos(b.time*2.8));if(Math.abs(Math.atan2(Math.sin(ang-opening),Math.cos(ang-opening)))>.63){addParticle(x,y,'#c6b7fb',4,.5);sound('pop');return;}}b.hp-=dmg;b.glow=.16;addParticle(x,y,'#fff8c0',6,.7);if(b.hp<=0){if(b.time<48){b.hp=1;}else{b.hp=0;b.defeated=true;S.badShots=[];S.enemies=[];winGame();}}}
function spawnBad(x,y,vx,vy,r=12,kind='dot',col='#f4a7c9',damage=15){S.badShots.push({x,y,vx,vy,r,kind,col,damage,life:8,t:0});}
function updateBoss(dt){const b=S.boss;if(!b||b.defeated)return;b.time+=dt;b.attackClock+=dt;b.fire-=dt;b.candy-=dt;b.glow=Math.max(0,b.glow-dt);let old=b.phase;let fraction=b.hp/b.maxHP;
 if((fraction<.72&&b.time>12)||b.time>21)b.phase=2;
 if((fraction<.37&&b.time>31)||b.time>39)b.phase=3;
 if(b.phase!==old){sound('boss');S.badShots=[];S.shake=12;announce(b.phase===2?'⚡ O BARÃO DESPERTOU!':'💥 ÚLTIMA RESISTÊNCIA!',b.phase===2?'Desvie do raio espiral!':'Cuidado com a investida!');}
 b.y=352+Math.sin(b.time*(b.phase===3?1.25:.7))*((b.phase===3)?126:83);
 if(b.phase===1){if(b.fire<=0){for(let i=-1;i<=1;i++)spawnBad(b.x-160,b.y+i*38, -rand(88,133),Math.sin(b.time+i)*14,14,'sleep','#ffadd5',10);b.fire=2.45/S.cfg.enemySpeed;}if(Math.sin(b.time*.55)>.81){S.wind=2.5;if(Math.random()<dt*7)spawnBad(b.x-170,rand(140,620),-240,rand(-30,30),9,'candy','#f8cb86',8);}}
 if(b.phase===2){let cycle=b.attackClock%13.6;b.beam=cycle>2.1&&cycle<4.55?1:cycle>0&&cycle<=2.1?2:0;b.beamY=clamp(b.y+70,195,555);if(b.beam===1 && Math.abs(S.player.y-b.beamY)<49 && S.player.x>55){let sheltered=[470,720].some(cx=>Math.abs(S.player.x-cx)<66&&Math.abs(S.player.y-b.beamY)<62);if(!sheltered)hurt(13);}if(b.candy<=0){b.candy=1.95;for(let i=0;i<6;i++)spawnBad(rand(355,1170),-25-rand(0,160),rand(-16,15),rand(95,165),13,'candy',['#f8a4ba','#ffe07d','#bd99ef'][i%3],12);}}
 if(b.phase===3){let cyc=b.attackClock%11;b.charge=cyc>1.4&&cyc<3.55?1:cyc<=1.4?2:0;b.x=b.charge===1?1090-260*Math.sin((cyc-1.4)/2.15*Math.PI):1090;
 if(b.charge===1 && dist2(S.player.x,S.player.y,b.x-95,b.y)<140**2)hurt(23);
 b.shield=(b.attackClock%14>5.8&&b.attackClock%14<9.7)?1:0;
 if(b.fire<=0){for(let i=-2;i<=2;i++)spawnBad(b.x-155,b.y, -145+Math.abs(i)*5,i*57,11,'dot','#b8ee7c',13);b.fire=2.4/S.cfg.enemySpeed;}
 }
 }
function updateHUD(){let p=S.player;if(!p)return;$('#healthFill').style.width=`${clamp(p.hp,0,100)}%`;$('#healthFill').style.background=p.hp<34?'linear-gradient(90deg,#ff6e87,#ffb878)':'linear-gradient(90deg,#74e2a3,#c1f88f)';$('#lives').textContent='♥ '.repeat(p.lives).trim();$('#waveLabel').textContent=S.boss?'BATALHA FINAL':`ONDA ${S.wave+1} DE 5`;$('#waveSubtitle').textContent=S.boss?'Recupere o cristal dos sonhos!':waveNames[S.wave];$('#waveFill').style.width=`${S.boss?'100':(S.waveTime/S.cfg.duration*100)}%`;$('#points').textContent=String(S.score).padStart(6,'0');$('#specialFill').style.width=`${100*(1-clamp(S.specialCD/(S.hero==='ben'?12.5:14),0,1))}%`;$('#specialText').textContent=S.specialCD>0?`ESPECIAL ${Math.ceil(S.specialCD)}s`:'★ ESPECIAL PRONTO!';if(S.boss){$('#bossHealth').style.width=`${clamp(100*S.boss.hp/S.boss.maxHP,0,100)}%`;$('#bossPhase').textContent=['','FASE 1 · GUARDIÃO ADORMECIDO','FASE 2 · DESPERTAR DO PESADELO','FASE 3 · ÚLTIMA RESISTÊNCIA'][S.boss.phase];}}
function update(dt){S.time+=dt;S.camera+=dt;S.toastT-=dt;if(S.toastT<=0)toast.classList.add('hidden');S.shake=Math.max(0,S.shake-dt*25);S.flash=Math.max(0,S.flash-dt);musicTick();
 if(S.scene!=='playing')return;
 S.levelTime+=dt;S.specialCD=Math.max(0,S.specialCD-dt*S.cfg.regen);
 const p=S.player;p.invuln=Math.max(0,p.invuln-dt);p.slow=Math.max(0,p.slow-dt);
 let dx=0,dy=0;if(keys.arrowleft||keys.a)dx--;if(keys.arrowright||keys.d)dx++;if(keys.arrowup||keys.w)dy--;if(keys.arrowdown||keys.s)dy++;
 let speed=p.slow>0?190:360;if(pointer.active){let vx=clamp((pointer.x-p.x)*8,-speed,speed),vy=clamp((pointer.y-p.y)*8,-speed,speed);p.vx=lerp(p.vx,vx,Math.min(1,dt*11));p.vy=lerp(p.vy,vy,Math.min(1,dt*11));}else{let len=Math.hypot(dx,dy)||1;p.vx=lerp(p.vx,dx/len*speed,Math.min(1,dt*12));p.vy=lerp(p.vy,dy/len*speed,Math.min(1,dt*12));}
 p.x=clamp(p.x+p.vx*dt+(S.wind>0?-33*dt:0),75,850);p.y=clamp(p.y+p.vy*dt,122,640);p.trail+=dt;
 S.fire-=dt;if(S.fire<=0){playerShoot();S.fire=.205;}if(fireTouch||keys[' ']){if(S.fire>.11)S.fire=.11;}
 S.wind=Math.max(0,S.wind-dt);
 if(!S.boss){S.waveTime+=dt;S.spawn-=dt;if(S.spawn<=0&&S.enemies.length<23){spawnEnemy();S.spawn=S.cfg.spawn*rand(.7,1.35);}if(S.waveTime>S.cfg.duration){S.wave++;S.waveTime=0;if(S.wave>=5){beginBoss();}else{p.hp=clamp(p.hp+20,0,100);announce(`ONDA ${S.wave+1} · ${waveNames[S.wave].toUpperCase()}`,'+20 de energia! ✨');}}}else updateBoss(dt);
 if(S.scene!=='playing'){updateHUD();return;}
 for(let i=S.enemies.length-1;i>=0;i--){let e=S.enemies[i];e.time+=dt;e.hit=Math.max(0,e.hit-dt);e.x+=e.vx*dt;if(e.mode===0)e.y=e.base+Math.sin(e.time*2.6+e.phase)*40;else if(e.mode===1)e.y=e.base+Math.sin(e.time*1.2+e.phase)*90;else e.y=e.base+Math.cos(e.time*4+e.phase)*23;
 e.shot-=dt;if(e.shot<=0&&e.x<W-50&&e.x>260){enemyFire(e);e.shot=rand(2.4,4.5)/S.cfg.enemySpeed;}if(e.x< -90){S.enemies.splice(i,1);continue;}if(dist2(e.x,e.y,p.x+28,p.y)<(e.r+28)**2){hurt(20);e.hp=0;if(S.scene!=='playing'){updateHUD();return;}}
 if(e.hp<=0){addParticle(e.x,e.y,e.type.main,14);S.score+=e.type.score;S.kills++;if(Math.random()<.15)spawnPickup(e.x,e.y);S.enemies.splice(i,1);sound('pop');}}
 for(let i=S.shots.length-1;i>=0;i--){let s=S.shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;let gone=s.life<0||s.x>W+100||s.y<0||s.y>H;if(!gone){for(let j=S.enemies.length-1;j>=0;j--){let e=S.enemies[j];if(dist2(s.x,s.y,e.x,e.y)<(s.r+e.r*.65)**2){e.hp-=s.damage;e.hit=.13;addParticle(s.x,s.y,s.col,5,.7);if(s.kind==='bomb'){blast(s.x,s.y,165,120);gone=true;}else if(s.kind!=='meteor')gone=true;else s.damage*=.45;break;}}
 if(S.boss&&!S.boss.defeated){let b=S.boss;if(s.x>b.x-169&&s.x<b.x+100&&Math.abs(s.y-(b.y+18))<190){bossDamage(s.damage,s.x,s.y);if(s.kind==='bomb')blast(s.x,s.y,196,175);gone=true;if(S.scene!=='playing'){updateHUD();return;}}}}
 if(s.kind==='meteor'||s.kind==='bomb') {if(Math.random()<.85)addParticle(s.x-s.r,s.y,s.col,2,.24);}if(gone)S.shots.splice(i,1);}
 for(let i=S.badShots.length-1;i>=0;i--){let b=S.badShots[i];if(b.remove){S.badShots.splice(i,1);continue;}b.t=(b.t||0)+dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.kind==='sleep')b.y+=Math.sin(b.t*4)*12*dt;if(dist2(b.x,b.y,p.x+17,p.y)<(b.r+26)**2){hurt(b.damage,b.kind==='sleep'?1.5:0);addParticle(b.x,b.y,b.col,7);S.badShots.splice(i,1);if(S.scene!=='playing'){updateHUD();return;}continue;}if(b.life<=0||b.x<-70||b.x>W+100||b.y>H+70||b.y< -250){if(b.kind==='candy')addParticle(b.x,Math.min(b.y,H-20),b.col,8);S.badShots.splice(i,1);}}
 for(let i=S.pickups.length-1;i>=0;i--){let o=S.pickups[i];o.t+=dt;o.x+=o.vx*dt;o.y=o.y0+Math.sin(o.t*3)*16;if(dist2(o.x,o.y,p.x,p.y)<48**2){if(o.kind==='heart')p.hp=clamp(p.hp+27,0,100);else S.specialCD=Math.max(0,S.specialCD-6);sound('pickup');addParticle(o.x,o.y,'#fff3a0',22);S.score+=300;S.pickups.splice(i,1);}else if(o.x< -60)S.pickups.splice(i,1);}
 for(let i=S.particles.length-1;i>=0;i--){let q=S.particles[i];q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=30*dt;q.vx*=.993;if(q.life<=0)S.particles.splice(i,1);}updateHUD();}
function blast(x,y,r,dmg){S.shake=10;addParticle(x,y,'#ffe981',60,2.4);addParticle(x,y,'#e4a8ff',30,2);for(const e of S.enemies){if(dist2(x,y,e.x,e.y)<r*r)e.hp-=dmg;}if(S.boss&&dist2(x,y,S.boss.x,S.boss.y)<(r+110)**2)bossDamage(dmg,x,y);}

// Desenho: cenário feito com formas vetoriais, parallax e personagens recortados dos desenhos enviados.
function round(x,y,w,h,r,fill,stroke=null,lw=2){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
function ellipse(x,y,rx,ry,fill,stroke=null,lw=3){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
function path(points,fill,stroke=null,lw=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
function starShape(x,y,outer,inner,count=5,rot=-Math.PI/2,fill='#fff3a0'){ctx.beginPath();for(let i=0;i<count*2;i++){let a=rot+i*Math.PI/count,r=i%2?inner:outer;ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
function drawCloud(x,y,s=1,col='#fff8fa',shade='#d9b6f0'){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(0,25,96,29,shade);for(let [cx,cy,r] of [[-63,13,32],[-29,-6,40],[12,-12,47],[60,10,35]])ellipse(cx,cy,r,r*.85,col);ellipse(-1,25,92,19,col);ctx.restore();}
function drawBackground(){let t=S.camera;if(S.scene==='menu')t=performance.now()/1000*.35;let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#4e65b8');g.addColorStop(.44,'#a888d3');g.addColorStop(.75,'#f6b4c8');g.addColorStop(1,'#ffe0aa');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // Moon and distant dreamy halo
 let halo=ctx.createRadialGradient(1040,161,10,1040,161,270);halo.addColorStop(0,'#fff5cdaa');halo.addColorStop(1,'#ffe0e600');ctx.fillStyle=halo;ctx.fillRect(730,0,580,440);ellipse(1040,160,66,66,'#fff2d3');ellipse(1019,141,12,14,'#f4d7c9');ellipse(1071,176,19,12,'#f3d9d2');
 for(let z of S.stars){let sx=((z.x-t*z.v*.29)%W+W)%W;ctx.globalAlpha=.43+.48*Math.sin(t*1.7+z.ph)**2;starShape(sx,z.y,z.r*2.2,z.r*.68,4,Math.PI/4,z.col);}ctx.globalAlpha=1;
 for(let layer=0;layer<3;layer++){let sp=[9,21,45][layer],off=t*sp,yy=[390,490,605][layer],col=['#899bd7','#b9a3df','#edb2d5'][layer];ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,yy);for(let x=-30;x<=W+45;x+=35)ctx.lineTo(x,yy+Math.sin((x+off)/115+layer)*40+Math.cos((x+off)/220)*17);ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=col;ctx.fill();}
 for(let i=0;i<7;i++){let speed=i%2?22:11,xx=((i*239-t*speed)%(W+360)+(W+360))%(W+360)-180,yy=135+(i*109)%460;drawCloud(xx,yy,.45+(i%3)*.22,i%2?'#ffebf7':'#f7f3ff','#d9c9f0');}
 // Magical candy hills drifting in the foreground
 for(let i=0;i<10;i++){let x=((i*184-t*57)%(W+200)+(W+200))%(W+200)-80,y=660+Math.sin(i*7)*20;ctx.save();ctx.translate(x,y);ctx.rotate(.06*Math.sin(t+i));round(-12,-75,24,103,13,'#efd6de','#bf9bcb',3);ellipse(0,-92,35,35,['#fc9dc4','#9ae8df','#ffe18b'][i%3],'#9876ad',3);ctx.strokeStyle='#fff6ff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,-92,23,0,TAU*.87);ctx.stroke();ctx.restore();}
 let low=ctx.createLinearGradient(0,550,0,H);low.addColorStop(0,'#ffffff00');low.addColorStop(1,'#fff9db55');ctx.fillStyle=low;ctx.fillRect(0,550,W,170);
}
function sprite(name,cx,cy,w,h=null,flip=false){let im=images[name];if(!im||!im.complete||!im.naturalWidth)return;let hh=h||w*im.height/im.width;ctx.save();ctx.translate(cx,cy);if(flip)ctx.scale(-1,1);ctx.drawImage(im,-w/2,-hh/2,w,hh);ctx.restore();}
function drawEnemy(e){let x=e.x,y=e.y,r=e.r*e.size;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(e.time*5+e.phase)*.11);ctx.scale(e.size,e.size);let k=e.type.kind;ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=4;
 if(k==='puff'){ellipse(-21,5,26,25,e.type.main,'#6d4b91');ellipse(20,9,25,24,e.type.main,'#6d4b91');ellipse(0,-13,27,31,'#ffe1ee','#6d4b91');ellipse(0,16,36,23,'#ffe1ee','#6d4b91');ellipse(-10,1,4,6,'#5b4777');ellipse(12,1,4,6,'#5b4777');ellipse(1,12,8,5,'#ff8bba');for(let t=-1;t<=1;t++)ellipse(t*21,-26,8,9,'#ffbddb','#6d4b91',2);}
 if(k==='bee'){for(let sy of [-1,1])ellipse(-9,sy*25,24,14,'#defef7','#7cabc0',3);ellipse(0,0,30,23,'#ffe68e','#805779');round(-9,-21,9,44,2,'#b5779d');ellipse(17,-7,5,7,'#59445f');ellipse(17,8,5,7,'#59445f');ellipse(-27,-5,4,4,'#ff99ba');}
 if(k==='bat'){ellipse(-39,0,26,19,'#b3a9f7','#6d619c');ellipse(39,0,26,19,'#b3a9f7','#6d619c');ellipse(0,0,34,29,'#cfc7ff','#655b9e');path([[-25,-16],[-23,-42],[-7,-28]],'#cfc7ff','#655b9e',4);path([[11,-28],[26,-43],[25,-13]],'#cfc7ff','#655b9e',4);ellipse(-12,0,5,7,'#443a70');ellipse(12,0,5,7,'#443a70');ellipse(0,13,6,4,'#fc9dc8');}
 if(k==='jelly'){ellipse(0,12,32,28,'#96ece0','#408d9e');ellipse(0,-8,29,28,'#c6fff2','#408d9e');for(let i=-1;i<=1;i++)ellipse(i*18,30,9,12,'#75d7cd','#408d9e',2);ellipse(-10,-8,4,6,'#366b8e');ellipse(11,-8,4,6,'#366b8e');ellipse(1,3,9,5,'#ffa0c3');}
 if(k==='star'){starShape(0,0,34,18,5,-Math.PI/2,'#ffe7a1');ctx.strokeStyle='#d79d65';ctx.lineWidth=4;ctx.stroke();ellipse(-9,-3,4,6,'#65496b');ellipse(10,-3,4,6,'#65496b');ellipse(0,11,8,5,'#ff9eb8');}
 if(e.hit>0){ctx.globalAlpha=e.hit*4;ellipse(0,0,r+9,r+9,'white');}ctx.restore();}
function drawShot(s){ctx.save();ctx.translate(s.x,s.y);if(s.kind==='rainbow'){for(let i=0;i<5;i++){ctx.shadowBlur=13;ctx.shadowColor=['#ed75ed','#f5db6f','#a0f7df','#a6b5ff','#ff99c6'][i];round(-34,-12+i*5,61,4,2,ctx.shadowColor);}starShape(21,0,12,5,5,0,'#ffffff');}
 else if(s.kind==='flame'||s.kind==='meteor'){let big=s.kind==='meteor';let r=s.r;ctx.rotate(Math.atan2(s.vy,s.vx));ellipse(-17,0,big?36:26,big?17:9,'#ff793d');ellipse(-9,0,big?25:19,big?13:8,'#ffe278');ellipse(0,0,r,r*.80,'#ffb459','#ff6d51',2);ellipse(5,-3,r*.48,r*.4,'#fff9a5');}
 else if(s.kind==='bomb'){for(let i=0;i<6;i++){ctx.rotate(Math.PI/3);starShape(0,-s.r-8,11,5,5,0,['#ffe17d','#ff8fe1','#9bf5d0'][i%3]);}ellipse(0,0,s.r,s.r,'#ff9ddd','#ffffff',4);starShape(0,0,s.r*.75,s.r*.34,7,0,'#fff79a');}ctx.restore();}
function drawBadShot(b){ctx.save();ctx.translate(b.x,b.y);let r=b.r;ctx.shadowBlur=15;ctx.shadowColor=b.col;if(b.kind==='sleep'){ellipse(0,0,r,r,b.col,'#fff5fb',2);ctx.font='900 17px Trebuchet MS';ctx.textAlign='center';ctx.fillStyle='#985caa';ctx.fillText('Z',0,6);}else if(b.kind==='candy'){ctx.rotate((b.t||0)*3);ellipse(0,0,r,r,b.col,'#fff3db',3);ctx.beginPath();ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.arc(0,0,r*.55,0,Math.PI*1.75);ctx.stroke();}else{ellipse(0,0,r,r,b.col,'#fff',2);ellipse(-3,-3,4,3,'#fffbed');}ctx.restore();}
function drawPlayer(){let p=S.player;if(!p)return;let pose=S.hero;let speed=Math.hypot(p.vx,p.vy);if(p.invuln>0 && Math.sin(S.time*21)>0)return;
 if(p.slow>0)pose+='_hurt';else if(p.vy>115)pose+='_dive';else if(speed>210)pose+='_dash';else if(S.fire<.11)pose+='_shoot';else pose+='_float';
 let img=images[pose]&&images[pose].complete?pose:S.hero;
 let wobble=Math.sin(S.time*5)*4,tilt=clamp(p.vy/1500,-.12,.12);ctx.save();ctx.translate(p.x,p.y+wobble);ctx.rotate(tilt);ellipse(-18,72,73,16,'#3e438344');sprite(img,0,0,S.hero==='ben'?220:218);ctx.restore();
 if(p.invuln>0){ctx.globalAlpha=.25+.16*Math.sin(S.time*13);ellipse(p.x,p.y,91,85,'#f1fff0','#fff6bd',4);ctx.globalAlpha=1;}
 if(p.slow>0){ctx.font='bold 21px Trebuchet MS';ctx.fillStyle='#fff5ff';ctx.fillText('Z z z',p.x-30,p.y-110);}}
function drawBoss(){let b=S.boss;if(!b)return;ctx.save();let size=b.phase===3?355:365;let name=b.phase===1?'boss_active':b.phase===2?'boss_angry':'boss_fury';if(b.phase===3&&b.charge===1)name='boss_charge';if(b.glow>0&&b.phase!==3)name='boss_hurt';
 if(b.phase===3&&b.shield){ctx.globalAlpha=.65;sprite('boss_shield',b.x-15,b.y,392,370);ctx.globalAlpha=1;}
 if(b.phase===2){ctx.shadowColor='#b05cff';ctx.shadowBlur=24;}
 sprite(name,b.x,b.y,size,size*1.18);
 // Crystal weak point: the chest
 let heartX=b.x+9,heartY=b.y+50;
 ctx.globalAlpha=.55+.45*Math.sin(S.time*5);ctx.shadowColor='#a9f6fd';ctx.shadowBlur=22;starShape(heartX,heartY,17,10,4,0,'#d8fff8');ctx.globalAlpha=1;ctx.shadowBlur=0;
 if(b.phase===1&&S.wind>0){ctx.strokeStyle='#e1bff3aa';ctx.lineWidth=4;for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(b.x-140-i*34,b.y+Math.sin(S.time*3+i)*15,24,2.2,5);ctx.stroke();}}
 if(b.phase===2&&b.beam){let by=b.beamY;let active=b.beam===1;ctx.globalAlpha=active?.9:.3;let grd=ctx.createLinearGradient(0,by-53,0,by+53);grd.addColorStop(0,'#aeff56');grd.addColorStop(.35,'#a84adb');grd.addColorStop(.5,'#fff4e9');grd.addColorStop(.68,'#e783f5');grd.addColorStop(1,'#aaff79');ctx.fillStyle=grd;ctx.shadowColor='#da9cff';ctx.shadowBlur=35;round(0,by-(active?48:9),b.x-150,active?96:18,11,grd);ctx.shadowBlur=0;ctx.globalAlpha=1;if(active){ctx.save();ctx.lineWidth=4;ctx.strokeStyle='#cafb9dbb';for(let xx=35;xx<b.x-180;xx+=72){ctx.beginPath();ctx.ellipse(xx,by,19,31,0,S.time*6,S.time*6+Math.PI*1.35);ctx.stroke();}ctx.restore();}if(!active){ctx.font='900 20px Trebuchet MS';ctx.fillStyle='#fff';ctx.fillText('⚠ RAIO CHEGANDO!',b.x-460,by-27);}for(let cx of [470,720]){drawCloud(cx,by+.4,.52,'#fff8ff','#a5e6e3');ctx.font='bold 15px Trebuchet MS';ctx.fillStyle='#6e5f9b';ctx.fillText('🛡',cx-13,by+8);}}
 if(b.phase===3&&b.charge===2){ctx.font='900 20px Trebuchet MS';ctx.fillStyle='#fff4af';ctx.fillText('⚠ INVESTIDA!',b.x-250,b.y-170);}
 ctx.restore();}
function drawPickups(){for(let o of S.pickups){ctx.save();ctx.translate(o.x,o.y);ctx.shadowColor=o.kind==='heart'?'#ff8faf':'#a9f5e8';ctx.shadowBlur=18;ellipse(0,0,21,21,'#fffaf0','#ddb7f7',3);ctx.font='bold 22px Arial';ctx.textAlign='center';ctx.fillText(o.kind==='heart'?'💗':'★',0,8);ctx.restore();}}
function drawParticles(){for(let q of S.particles){ctx.globalAlpha=clamp(q.life/q.max,0,1);if(q.type==='star')starShape(q.x,q.y,q.r*1.7,q.r*.5,4,q.rot,q.col);else ellipse(q.x,q.y,q.r,q.r,q.col);}ctx.globalAlpha=1;}
function draw(){ctx.save();if(S.shake>0)ctx.translate(rand(-S.shake,S.shake),rand(-S.shake,S.shake));drawBackground();if(S.scene!=='menu') {for(let o of S.pickups){}drawPickups();for(let e of S.enemies)drawEnemy(e);if(S.boss)drawBoss();for(let b of S.badShots)drawBadShot(b);for(let s of S.shots)drawShot(s);drawPlayer();drawParticles();if(S.wind>0&&S.scene==='playing'){ctx.fillStyle='#e4d0f225';ctx.fillRect(0,0,W,H);}}else{ctx.globalAlpha=.28;sprite('boss_idle',1110,340,290);ctx.globalAlpha=1;}
 if(S.flash>0){ctx.globalAlpha=S.flash*1.8;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}ctx.restore();}
function frame(now){let dt=Math.min(.034,(now-(S.last||now))/1000);S.last=now;update(dt);draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();
