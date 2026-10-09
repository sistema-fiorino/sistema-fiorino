import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
const firebaseConfig={
 apiKey:"AIzaSyBPWBB-vnsLjJbbEcYW2FKNtZBczZt6qs8",
 authDomain:"sistema-fiorino.firebaseapp.com",
 projectId:"sistema-fiorino",
 storageBucket:"sistema-fiorino.firebasestorage.app",
 messagingSenderId:"793318262994",
 appId:"1:793318262994:web:455dd3abf23b573f19450b"
};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
const el=id=>document.getElementById(id), login=el("loginForm"),register=el("registerForm");
let registering=false;
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
function showApp(user,preferredName){
 el("auth").hidden=true;el("app").hidden=false;
 const name=preferredName||user.displayName||user.email?.split("@")[0]||"usuário";
 el("accountEmail").textContent=user.email||"Sem e-mail";
 el("userName").textContent=name;
 const avatar=el("avatarInitials");avatar.textContent=name[0]?.toUpperCase()||"F";
 if(user.photoURL){const img=document.createElement("img");img.src=user.photoURL;img.alt="Foto de perfil";img.style.cssText="height:100%;width:100%;object-fit:cover;border-radius:50%";avatar.replaceChildren(img)}
 // Leitura opcional: nunca bloquear a abertura do sistema aguardando o Firestore.
 getDoc(doc(db,"usuarios",user.uid)).then(snap=>{
  if(auth.currentUser?.uid!==user.uid||!snap.exists())return;
  const p=snap.data(),display=p.apelido||p.nome||name;
  el("userName").textContent=display;
  if(!user.photoURL)el("avatarInitials").textContent=display[0]?.toUpperCase()||"F";
 }).catch(e=>console.warn("Perfil não disponível:",e.code));
}
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
 if(file&&(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>2*1024*1024)){err.textContent="A foto precisa ser JPG, PNG ou WebP, com até 2 MB.";return}
 btn.disabled=true;btn.textContent="Criando conta…";registering=true;
 try{
  // Somente a autenticação é necessária para entrar no painel.
  const credential=await withTimeout(createUserWithEmailAndPassword(auth,email,senha),25000);
  const user=credential.user,displayName=apelido||nome;
  register.reset();
  showApp(user,displayName);
  // Firestore e Storage são complementares; não seguram a tela no "Criando conta".
  void (async()=>{
   const problems=[];
   try{await withTimeout(updateProfile(user,{displayName}),12000)}catch(e){problems.push("nome de exibição");console.warn("Nome:",e)}
   let photoURL="";
   if(file){try{
    const location=ref(storage,`usuarios/${user.uid}/perfil`);
    await withTimeout(uploadBytes(location,file,{contentType:file.type}),15000);
    photoURL=await withTimeout(getDownloadURL(location),10000);
    await withTimeout(updateProfile(user,{photoURL}),10000);
   }catch(e){problems.push("foto");console.warn("Foto:",e)}}
   try{await withTimeout(setDoc(doc(db,"usuarios",user.uid),{
    uid:user.uid,nome,sobrenome,apelido,sexo,email:user.email,photoURL,criadoEm:new Date().toISOString()
   }),12000)}catch(e){problems.push("dados no Firestore");console.warn("Firestore:",e)}
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
