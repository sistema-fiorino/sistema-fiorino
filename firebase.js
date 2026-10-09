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
async function showApp(user){
 el("auth").hidden=true;el("app").hidden=false;
 let name=user.displayName||user.email?.split("@")[0]||"usuário";
 try{const snap=await getDoc(doc(db,"usuarios",user.uid));if(snap.exists()){const p=snap.data();name=p.apelido||p.nome||name}}catch(e){console.warn("Perfil não disponível no Firestore:",e.code)}
 el("accountEmail").textContent=user.email||"Sem e-mail";
 el("userName").textContent=name;
 const avatar=el("avatarInitials");avatar.textContent=name[0]?.toUpperCase()||"F";
 if(user.photoURL){const img=document.createElement("img");img.src=user.photoURL;img.alt="Foto de perfil";img.style.cssText="height:100%;width:100%;object-fit:cover;border-radius:50%";avatar.replaceChildren(img)}
}
onAuthStateChanged(auth,user=>{if(registering)return;user?showApp(user):showLogin()},()=>{showLogin();el("authError").textContent="Não foi possível verificar a sessão."});
login.addEventListener("submit",async e=>{e.preventDefault();const btn=el("loginSubmit");btn.disabled=true;btn.textContent="Entrando…";el("authError").textContent="";try{await signInWithEmailAndPassword(auth,el("emailLogin").value.trim(),el("senhaLogin").value)}catch(err){el("authError").textContent=errorMessage(err)}finally{btn.disabled=false;btn.textContent="Entrar"}});
register.addEventListener("submit",async e=>{
 e.preventDefault();const btn=el("registerSubmit"),err=el("registerError");err.textContent="";
 const nome=el("nomeCadastro").value.trim(),sobrenome=el("sobrenomeCadastro").value.trim(),apelido=el("apelidoCadastro").value.trim();
 const email=el("emailCadastro").value.trim(),senha=el("senhaCadastro").value,sexo=el("sexoCadastro").value;
 const file=el("fotoCadastro").files[0];
 if(!nome||!sobrenome||senha.length<6){err.textContent="Preencha nome, sobrenome e senha de pelo menos 6 caracteres.";return}
 if(file&&(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>2*1024*1024)){err.textContent="A foto precisa ser JPG, PNG ou WebP, com até 2 MB.";return}
 btn.disabled=true;btn.textContent="Criando conta…";registering=true;
 let accountCreated=false,profileSaved=false,photoSaved=!file;
 try{
  const credential=await createUserWithEmailAndPassword(auth,email,senha);accountCreated=true;
  const user=credential.user;const displayName=apelido||nome;
  await updateProfile(user,{displayName});
  let photoURL="";
  if(file){try{const location=ref(storage,`usuarios/${user.uid}/perfil`);await uploadBytes(location,file,{contentType:file.type});photoURL=await getDownloadURL(location);await updateProfile(user,{photoURL});photoSaved=true}catch(photoError){console.warn("Foto não enviada:",photoError.code)}}
  try{await setDoc(doc(db,"usuarios",user.uid),{
   uid:user.uid,nome,sobrenome,apelido,sexo,email:user.email,photoURL,criadoEm:new Date().toISOString()
  });profileSaved=true}catch(dbError){console.warn("Perfil não gravado:",dbError.code)}
  register.reset();
  if(!profileSaved||!photoSaved){alert("Conta criada e acesso liberado. "+(!profileSaved?"O perfil ainda não foi salvo no Firestore; verifique se o banco está criado e as regras de segurança estão configuradas. ":"")+(!photoSaved?"A foto não foi enviada; verifique o Storage.":""))}
  await showApp(user);
 }catch(e){err.textContent=accountCreated?"Conta criada, mas não foi possível finalizar o perfil. Entre com seu e-mail e senha.":errorMessage(e)}
 finally{registering=false;btn.disabled=false;btn.textContent="Criar conta"}
});
for(const btn of document.querySelectorAll("[data-password-toggle],#toggleLoginPassword"))btn.addEventListener("click",()=>{
 const field=el(btn.dataset.passwordToggle||"senhaLogin"),show=field.type==="password";field.type=show?"text":"password";
 btn.setAttribute("aria-pressed",String(show));btn.setAttribute("aria-label",show?"Ocultar senha":"Mostrar senha");
 btn.innerHTML=show?'<i data-lucide="eye-off"></i>':'<i data-lucide="eye"></i>';window.lucide?.createIcons();
});
document.querySelectorAll("[data-logout],#headerLogoutButton").forEach(btn=>btn.addEventListener("click",async()=>{btn.disabled=true;try{await signOut(auth)}catch(e){alert("Não foi possível sair. Tente novamente.")}finally{btn.disabled=false}}));
