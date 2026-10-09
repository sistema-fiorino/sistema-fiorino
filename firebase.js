import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const firebaseConfig={
 apiKey:"AIzaSyBPWBB-vnsLjJbbEcYW2FKNtZBczZt6qs8",
 authDomain:"sistema-fiorino.firebaseapp.com",
 projectId:"sistema-fiorino",
 storageBucket:"sistema-fiorino.firebasestorage.app",
 messagingSenderId:"793318262994",
 appId:"1:793318262994:web:455dd3abf23b573f19450b"
};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const el=id=>document.getElementById(id), login=el("loginForm"),register=el("registerForm");
let registering=false;
const VEHICLES=Object.freeze({classica:{src:"assets/Vaneta Fiorino Branca em Pixel Art.png",label:"Fiorino clássica"},moderna:{src:"assets/fiorino-moderna.webp",label:"Fiorino moderna"}});
let activeVehicle="classica";
function renderVehicle(choice){
 const next=Object.hasOwn(VEHICLES,choice)?choice:"classica";
 activeVehicle=next;
 const img=el("selectedVehicleImage");
 if(img){img.src=VEHICLES[next].src;img.alt=VEHICLES[next].label+" escolhida para o painel";}
 const input=document.querySelector('input[name="vehicleOption"][value="'+next+'"]');if(input)input.checked=true;
}
el("applyVehicle")?.addEventListener("click",async()=>{
 const user=auth.currentUser,btn=el("applyVehicle"),status=el("vehicleStatus");
 if(!user){status.textContent="Entre na conta para aplicar.";return}
 const picked=document.querySelector('input[name="vehicleOption"]:checked')?.value;
 if(!Object.hasOwn(VEHICLES,picked)){status.textContent="Selecione um modelo válido.";return}
 btn.disabled=true;status.textContent="Salvando escolha…";
 try{
  const profileRef=doc(db,"usuarios",user.uid);
  const snapshot=await withTimeout(getDoc(profileRef),10000);
  // Se o perfil ainda não existe, criar com os campos exigidos pelas regras.
  const payload=snapshot.exists()?{veiculoSelecionado:picked}:{
   uid:user.uid,email:user.email,
   nome:user.displayName||user.email?.split("@")[0]||"Usuário",
   sobrenome:"",apelido:"",sexo:"",criadoEm:new Date().toISOString(),
   veiculoSelecionado:picked
  };
  await withTimeout(setDoc(profileRef,payload,{merge:true}),15000);
  if(auth.currentUser?.uid!==user.uid)return;
  renderVehicle(picked);status.textContent="Veículo aplicado e salvo na sua conta.";
 }catch(e){
  status.textContent=e.code==="permission-denied"?"O Firestore bloqueou a alteração. Publique as regras atualizadas do perfil antes de tentar.":"Não foi possível salvar o veículo. Confira a conexão e tente novamente.";
 }finally{btn.disabled=false}
});

const errorMessage=e=>({
 "auth/invalid-credential":"E-mail ou senha incorretos.","auth/invalid-email":"Informe um e-mail válido.",
 "auth/email-already-in-use":"Já existe uma conta com este e-mail.","auth/weak-password":"A senha precisa ter pelo menos 6 caracteres.",
 "auth/too-many-requests":"Muitas tentativas. Aguarde e tente novamente.",
 "auth/network-request-failed":"Problema de conexão. Tente novamente.",
 "auth/operation-not-allowed":"Ative o método E-mail/senha no Firebase.",
 "auth/unauthorized-domain":"Autorize o domínio publicado em Firebase Authentication."
}[e.code]||"Não foi possível concluir. Tente novamente.");
function changeAuthForm(mode){
 login.hidden=mode!=="loginForm";register.hidden=mode!=="registerForm";
 el("authError").textContent="";el("registerError").textContent="";
 el("registrationNotice").textContent="";
 window.lucide?.createIcons();
}
document.querySelectorAll("[data-auth]").forEach(b=>b.addEventListener("click",()=>changeAuthForm(b.dataset.auth)));
function showLogin(){el("auth").hidden=false;el("app").hidden=true;el("authLoading").hidden=true;changeAuthForm("loginForm")}
const MAX_PHOTO_BYTES=100*1024*1024;
function validatePhoto(file){
 if(!file)throw new Error("Selecione uma foto.");
 if(file.size>MAX_PHOTO_BYTES)throw new Error("A imagem deve ter no máximo 100 MB.");
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
}
async function preparePhoto(file){
 validatePhoto(file);
 const objectURL=URL.createObjectURL(file);
 try {
  const img=await Promise.race([
   new Promise((resolve,reject)=>{
    const picture=new Image();
    picture.onload=()=>resolve(picture);
    picture.onerror=()=>reject(new Error("Não foi possível abrir a imagem."));
    picture.src=objectURL;
   }),
   new Promise((_,reject)=>setTimeout(()=>reject(new Error("Tempo excedido ao abrir a imagem.")),15000))
  ]);
  const maxSide=256,scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext("2d");
  if(!ctx)throw new Error("O navegador não conseguiu processar a imagem.");
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  // JPEG pequeno, sem Storage, dentro do limite de 1 MiB por documento Firestore.
  let encoded=canvas.toDataURL("image/jpeg",0.72);
  if(encoded.length>110000)encoded=canvas.toDataURL("image/jpeg",0.45);
  if(encoded.length>110000)throw new Error("A foto ficou grande demais. Escolha outra imagem.");
  return encoded;
 }finally{URL.revokeObjectURL(objectURL)}
}
function photoError(error){
 if(error?.code==="permission-denied")return "Firestore bloqueou o salvamento. Confira se publicou as regras de acesso ao próprio perfil.";
 if(error?.code==="unavailable")return "Firestore indisponível. Confira a conexão e tente novamente.";
 if(error?.message==="timeout")return "O Firestore demorou a responder. Confira o perfil antes de tentar salvar novamente.";
 return error?.message||"Não foi possível salvar a foto no Firestore.";
}
async function savePhoto(user,file,onProgress){
 onProgress?.("Otimizando imagem para o Firestore…");
 const photoData=await preparePhoto(file);
 onProgress?.("Salvando foto no perfil…");
 const profileRef=doc(db,"usuarios",user.uid);
 // Evitar uma escrita em um campo não autorizado pelas regras: photoURL é aceito.
 const existing=await withTimeout(getDoc(profileRef),10000);
 const update=existing.exists()?{photoURL:photoData}:{
  uid:user.uid,email:user.email,nome:user.displayName||user.email?.split("@")[0]||"Usuário",
  sobrenome:"",apelido:"",sexo:"",criadoEm:new Date().toISOString(),photoURL:photoData
 };
 await withTimeout(setDoc(profileRef,update,{merge:true}),15000);
 return photoData;
}

function renderPhoto(user,photoURL,name){
 const src=photoURL||user.photoURL||"";
 for(const id of ["avatarInitials","profilePhotoPreview"]){
  const slot=el(id);if(!slot)continue;
  slot.replaceChildren(document.createTextNode((name||"F")[0].toUpperCase()));
  if(src){
   const img=document.createElement("img");img.src=src;img.alt="Foto do perfil";img.decoding="async";img.referrerPolicy="no-referrer";
   img.onerror=()=>{img.remove();const status=el("profilePhotoStatus");if(status)status.textContent="A foto cadastrada não pôde ser carregada. Selecione a imagem novamente e toque em Salvar foto.";};
   slot.replaceChildren(img);
  }
 }
}
function showApp(user,preferredName){
 el("auth").hidden=true;el("app").hidden=false;
 const name=preferredName||user.displayName||user.email?.split("@")[0]||"usuário";
 el("accountEmail").textContent=user.email||"Sem e-mail";
 el("userName").textContent=name;
 el("profileDisplayName").textContent=name;
 renderVehicle("classica");
 el("vehicleStatus").textContent="";
 renderPhoto(user,user.photoURL,name);
 const photoStatus=el("profilePhotoStatus");
 if(photoStatus)photoStatus.textContent=user.photoURL?"":"Ainda não há uma foto salva neste perfil. Você pode adicionar uma aqui.";
 // Dados do Firestore são opcionais: o painel abre imediatamente.
 getDoc(doc(db,"usuarios",user.uid)).then(snap=>{
  if(auth.currentUser?.uid!==user.uid||!snap.exists())return;
  const profile=snap.data();
  renderVehicle(profile.veiculoSelecionado);
  const display=profile.apelido||profile.nome||name;
  el("userName").textContent=display;el("profileDisplayName").textContent=display;
  renderPhoto(user,profile.photoURL||user.photoURL,display);
  if((profile.photoURL||user.photoURL)&&photoStatus)photoStatus.textContent="";
 }).catch(e=>console.warn("Perfil não disponível:",e.code));
}
el("saveProfilePhoto")?.addEventListener("click",async()=>{
 const user=auth.currentUser,file=el("profilePhotoFile").files?.[0],status=el("profilePhotoStatus"),btn=el("saveProfilePhoto");
 if(!user){status.textContent="Entre na sua conta para alterar a foto.";return}
 btn.disabled=true;
 try{
  status.textContent="Preparando imagem…";
  const photo=await savePhoto(user,file,text=>status.textContent=text);
  renderPhoto(user,photo,el("profileDisplayName").textContent);
  el("profilePhotoFile").value="";
  status.textContent="Foto salva e atualizada no topo e no perfil.";
 }catch(e){console.warn("Falha ao salvar a foto",e);status.textContent=photoError(e)}
 finally{btn.disabled=false}
});

function withTimeout(promise,ms){
 let timeoutId;
 return Promise.race([promise,new Promise((_,reject)=>{timeoutId=setTimeout(()=>reject(new Error("timeout")),ms)})]).finally(()=>clearTimeout(timeoutId));
}

onAuthStateChanged(auth,user=>{if(registering)return;user?showApp(user):showLogin()},()=>{showLogin();el("authError").textContent="Não foi possível verificar a sessão."});
login.addEventListener("submit",async e=>{e.preventDefault();const btn=el("loginSubmit");btn.disabled=true;btn.textContent="Entrando…";el("authError").textContent="";try{await signInWithEmailAndPassword(auth,el("emailLogin").value.trim(),el("senhaLogin").value)}catch(err){el("authError").textContent=errorMessage(err)}finally{btn.disabled=false;btn.textContent="Entrar"}});
register.addEventListener("submit",async e=>{
 e.preventDefault();const btn=el("registerSubmit"),err=el("registerError");err.textContent="";
 const nome=el("nomeCadastro").value.trim(),sobrenome=el("sobrenomeCadastro").value.trim(),apelido=el("apelidoCadastro").value.trim();
 const email=el("emailCadastro").value.trim(),senha=el("senhaCadastro").value,sexo=el("sexoCadastro").value,file=el("fotoCadastro").files[0];
 if(!nome||!sobrenome||senha.length<6){err.textContent="Preencha nome, sobrenome e senha de pelo menos 6 caracteres.";return}
 if(file){try{validatePhoto(file)}catch(error){err.textContent=error.message;return}}
 btn.disabled=true;btn.textContent="Criando conta…";registering=true;
 try{
  // Somente a autenticação é necessária para entrar no painel.
  const credential=await withTimeout(createUserWithEmailAndPassword(auth,email,senha),25000);
  const user=credential.user,displayName=apelido||nome;
  register.reset();
  showApp(user,displayName);
  // Firestore e Storage são complementares; não seguram a abertura do painel.
  const uploadStatus=el("profilePhotoStatus");
  if(file&&uploadStatus)uploadStatus.textContent="Sua conta foi criada. Estamos salvando sua foto…";
  void (async()=>{
   const problems=[];
   try{await withTimeout(updateProfile(user,{displayName}),12000)}catch(e){problems.push("nome de exibição");console.warn("Nome:",e)}
   let photoURL="";
   if(file){try{
    photoURL=await savePhoto(user,file,text=>{if(uploadStatus)uploadStatus.textContent=text});
    renderPhoto(user,photoURL,displayName);
    if(uploadStatus)uploadStatus.textContent="Foto de perfil salva com sucesso.";
   }catch(e){problems.push("foto");console.warn("Foto:",e);if(uploadStatus)uploadStatus.textContent=storageFailure(e)+" Você pode tentar novamente em Configurações."}}
   try{await withTimeout(setDoc(doc(db,"usuarios",user.uid),{
    uid:user.uid,nome,sobrenome,apelido,sexo,email:user.email,criadoEm:new Date().toISOString(),
    ...(photoURL?{photoURL}:{})
   },{merge:true}),12000)}catch(e){problems.push("dados no Firestore");console.warn("Firestore:",e)}
   if(problems.length)console.warn("Conta criada, mas faltou salvar:",problems.join(", ")); 
  })();
 }catch(e){
  err.textContent=e.message==="timeout"?"O Firebase demorou para responder. Verifique em Authentication → Usuários se a conta foi criada antes de tentar novamente.":errorMessage(e);
 }finally{registering=false;btn.disabled=false;btn.textContent="Criar conta"}
});

for(const btn of document.querySelectorAll("[data-password-toggle],#toggleLoginPassword"))btn.addEventListener("click",()=>{
 const field=el(btn.dataset.passwordToggle||"senhaLogin"),show=field.type==="password";field.type=show?"text":"password";
 btn.setAttribute("aria-pressed",String(show));btn.setAttribute("aria-label",show?"Ocultar senha":"Mostrar senha");
 btn.innerHTML=show?'<i data-lucide="eye-off"></i>':'<i data-lucide="eye"></i>';window.lucide?.createIcons();
});
document.querySelectorAll("[data-logout],#headerLogoutButton").forEach(btn=>btn.addEventListener("click",async()=>{btn.disabled=true;try{await signOut(auth)}catch(e){alert("Não foi possível sair. Tente novamente.")}finally{btn.disabled=false}}));
