// Firebase do Sistema Fiorino. Inicialização apenas: sem Auth, Firestore ou Storage.
// As configurações do app Web são identificadores públicos; nunca insira chaves privadas aqui.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyBPWBB-vnsLjJbbEcYW2FKNtZBczZt6qs8",
  authDomain: "sistema-fiorino.firebaseapp.com",
  projectId: "sistema-fiorino",
  storageBucket: "sistema-fiorino.firebasestorage.app",
  messagingSenderId: "793318262994",
  appId: "1:793318262994:web:455dd3abf23b573f19450b"
};

export const firebaseApp = initializeApp(firebaseConfig);
console.info("Firebase configurado para o projeto:", firebaseApp.options.projectId);
