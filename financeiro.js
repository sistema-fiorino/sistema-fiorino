import {getApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFirestore,collection,addDoc,deleteDoc,doc,onSnapshot,query} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const auth=getAuth(getApp()),db=getFirestore(getApp()),$=id=>document.getElementById(id);
function withTimeout(promise,ms=15000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("timeout")),ms)})]).finally(()=>clearTimeout(timer))}
const money=n=>(Number(n)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
let entries={receitas:[],despesas:[]},stop=[],currentUid=null;
function totals(){
 const sum=kind=>entries[kind].reduce((acc,e)=>acc+Number(e.valor||0),0);
 const r=sum("receitas"),d=sum("despesas");
 $("receitasTotal").textContent=money(r);$("despesasTotal").textContent=money(d);
 $("resumoReceitas").textContent=money(r);$("resumoDespesas").textContent=money(d);$("resumoSaldo").textContent=money(r-d);
 $("fretesCount").textContent=String(entries.receitas.length);
}
function render(kind){
 const root=$(kind+"Lista");root.replaceChildren();
 if(!entries[kind].length){const p=document.createElement("p");p.className="muted";p.textContent="Nenhum lançamento registrado.";root.append(p);return}
 for(const item of [...entries[kind]].sort((a,b)=>b.data.localeCompare(a.data))){
  const card=document.createElement("article");card.className="finance-entry";
  const left=document.createElement("div"),title=document.createElement("strong"),details=document.createElement("small"),right=document.createElement("div"),value=document.createElement("b"),remove=document.createElement("button");
  title.textContent=item.descricao;details.textContent=[item.data.split("-").reverse().join("/"),kind==="receitas"?item.cliente:item.categoria].filter(Boolean).join(" • ");
  value.textContent=money(item.valor);remove.type="button";remove.textContent="Excluir";remove.className="finance-delete";
  remove.addEventListener("click",async()=>{if(!confirm("Excluir este lançamento?"))return;remove.disabled=true;try{await withTimeout(deleteDoc(doc(db,"usuarios",currentUid,kind,item.id)))}catch(e){alert("Não foi possível excluir. Confira as permissões do Firestore.");remove.disabled=false}});
  left.append(title,details);right.append(value,remove);card.append(left,right);root.append(card);
 }
}
function subscribe(user){
 stop.forEach(fn=>fn());stop=[];currentUid=user?.uid||null;entries={receitas:[],despesas:[]};totals();render("receitas");render("despesas");
 if(!user)return;
 for(const kind of ["receitas","despesas"]){
  const unsub=onSnapshot(query(collection(db,"usuarios",user.uid,kind)),snap=>{
   entries[kind]=snap.docs.map(d=>({id:d.id,...d.data()}));render(kind);totals();$(kind+"Status").textContent="";
  },err=>{$(kind+"Status").textContent="Não foi possível carregar os dados. Verifique se o Firestore está criado e as regras estão publicadas.";console.warn("Firestore",kind,err.code)});
  stop.push(unsub);
 }
}
for(const kind of ["receitas","despesas"]){
 const form=$(kind+"Form");form.addEventListener("submit",async ev=>{
  ev.preventDefault();if(!currentUid)return;
  const prefix=kind==="receitas"?"receita":"despesa";
  const value=Number($(prefix+"Valor").value),description=$(prefix+"Descricao").value.trim(),date=$(prefix+"Data").value;
  if(!description||!date||!Number.isFinite(value)||value<=0)return;
  const data={descricao:description,valor:Math.round(value*100)/100,data:date};
  if(kind==="receitas")data.cliente=$("receitaCliente").value.trim();else data.categoria=$("despesaCategoria").value;
  const button=form.querySelector('button[type="submit"]');button.disabled=true;$(kind+"Status").textContent="Salvando…";
  try{await withTimeout(addDoc(collection(db,"usuarios",currentUid,kind),data));form.reset();$(prefix+"Data").value=new Date().toLocaleDateString("en-CA");$(kind+"Status").textContent="Lançamento salvo."}
  catch(err){$(kind+"Status").textContent=err.message==="timeout"?"O banco demorou a responder. Confira a conexão e verifique se o registro foi salvo antes de tentar novamente.":"Falha ao salvar. Confira as regras e a criação do Firestore.";console.warn(err)}
  finally{button.disabled=false}
 });
 const date=$(kind==="receitas"?"receitaData":"despesaData");date.value=new Date().toLocaleDateString("en-CA");
}
onAuthStateChanged(auth,subscribe);
