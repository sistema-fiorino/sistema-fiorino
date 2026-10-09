import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
const firebaseConfig = {
 apiKey: "AIzaSyBPWBB-vnsLjJbbEcYW2FKNtZBczZt6qs8",
 authDomain: "sistema-fiorino.firebaseapp.com",
 projectId: "sistema-fiorino",
 storageBucket: "sistema-fiorino.firebasestorage.app",
 messagingSenderId: "793318262994",
 appId: "1:793318262994:web:455dd3abf23b573f19450b"
};
const app=initializeApp(firebaseConfig), auth=getAuth(app);
const el=id=>document.getElementById(id);
const form=el('loginForm'),error=el('authError'),submit=el('loginSubmit');
function showLogin(){el('auth').hidden=false;el('app').hidden=true;el('authLoading').hidden=true;form.hidden=false;form.reset();error.textContent='';}
function showApp(user){el('auth').hidden=true;el('app').hidden=false;el('accountEmail').textContent=user.email || 'Sem e-mail';const label=user.displayName||user.email?.split('@')[0]||'usuário';el('userName').textContent=label;el('avatarInitials').textContent=label[0]?.toUpperCase()||'F';}
onAuthStateChanged(auth,user=>user?showApp(user):showLogin(),()=>{showLogin();error.textContent='Não foi possível verificar o acesso. Tente novamente.'});
form.addEventListener('submit',async event=>{event.preventDefault();error.textContent='';submit.disabled=true;submit.textContent='Entrando…';try{await signInWithEmailAndPassword(auth,el('emailLogin').value.trim(),el('senhaLogin').value)}catch(e){const map={'auth/invalid-credential':'E-mail ou senha incorretos.','auth/invalid-email':'Informe um e-mail válido.','auth/too-many-requests':'Muitas tentativas. Aguarde e tente novamente.','auth/user-disabled':'Esta conta está desativada.','auth/network-request-failed':'Sem conexão com a internet. Tente novamente.','auth/operation-not-allowed':'Ative o método E-mail/senha no Firebase Authentication.','auth/unauthorized-domain':'Adicione o domínio do site aos domínios autorizados no Firebase Authentication.'};error.textContent=map[e.code]||'Não foi possível entrar. Verifique seus dados e tente novamente.'}finally{submit.disabled=false;submit.textContent='Entrar'}});
el('toggleLoginPassword').addEventListener('click',()=>{const input=el('senhaLogin');const showing=input.type==='password';input.type=showing?'text':'password';const button=el('toggleLoginPassword');button.setAttribute('aria-pressed',String(showing));button.setAttribute('aria-label',showing?'Ocultar senha':'Mostrar senha');button.innerHTML=showing?'<i data-lucide="eye-off"></i>':'<i data-lucide="eye"></i>';window.lucide?.createIcons()});
document.querySelectorAll('[data-logout],#headerLogoutButton').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;try{await signOut(auth)}catch(e){alert('Não foi possível sair. Tente novamente.')}finally{button.disabled=false}}));
