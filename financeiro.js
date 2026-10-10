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
 $("entradasTotal").textContent=money(r);

 const totalFretes=entries.receitas.filter(e=>!e.categoria||e.categoria==="Frete").reduce((acc,e)=>acc+Number(e.valor||0),0);
 $("fretesValorTotal").textContent=money(totalFretes);
 $("resumoReceitas").textContent=money(r);$("resumoDespesas").textContent=money(d);$("resumoSaldo").textContent=money(r-d);
 $("outrosRecebidosTotal").textContent=money(r-totalFretes);
 $("fretesCount").textContent=String(entries.receitas.filter(e=>!e.categoria||e.categoria==="Frete").length);
}
function render(kind){
 if(kind==="despesas"){renderExpenseCategories();return;}
 const root=$(kind+"Lista");root.replaceChildren();
 if(!entries[kind].length){const p=document.createElement("p");p.className="muted";p.textContent="Nenhum lançamento registrado.";root.append(p);return}
 for(const item of [...entries[kind]].sort((a,b)=>b.data.localeCompare(a.data))){
  const card=document.createElement("article");card.className="finance-entry";
  const left=document.createElement("div"),title=document.createElement("strong"),details=document.createElement("small"),right=document.createElement("div"),value=document.createElement("b"),remove=document.createElement("button");
  title.textContent=item.descricao;details.textContent=[item.data.split("-").reverse().join("/"),kind==="receitas"?[item.categoria||"Frete",item.cliente].filter(Boolean).join(" • "):item.categoria].filter(Boolean).join(" • ");
  value.textContent=money(item.valor);remove.type="button";remove.textContent="Excluir";remove.className="finance-delete";
  remove.addEventListener("click",async()=>{if(!confirm("Excluir este lançamento?"))return;remove.disabled=true;try{await withTimeout(deleteDoc(doc(db,"usuarios",currentUid,kind,item.id)))}catch(e){alert("Não foi possível excluir. Confira as permissões do Firestore.");remove.disabled=false}});
  left.append(title,details);right.append(value,remove);card.append(left,right);root.append(card);
 }
}

const expenseCategories=["Combustível","Manutenção","Pedágio","Alimentação","Seguro","Impostos e taxas","Outros"];
const expenseMonths=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
let expenseDraftYear=new Date().getFullYear(),expenseDraftMonths=new Set(),expenseAppliedPeriods=null;
const expenseDate=e=>typeof e.data==="string"?e.data:"";
function expenseMatches(e){return expenseAppliedPeriods===null||expenseAppliedPeriods.has(expenseDate(e).slice(0,7));}
function expensePeriodLabel(){if(expenseAppliedPeriods===null)return "Todos os meses";let keys=[...expenseAppliedPeriods].sort();return keys.length?keys.map(k=>expenseMonths[Number(k.slice(5))-1]+"/"+k.slice(0,4)).join(", "):"Nenhum mês selecionado";}
function setExpensePeriodStatus(){ const label=expensePeriodLabel(); $("expensesPeriodStatus").textContent=""; $("expensesPeriodButton").textContent=label+" ▾"; $("expensesPeriodButton").setAttribute("aria-label","Período selecionado: "+label+". Alterar meses");}
function makeExpenseButton(label,className,handler){let b=document.createElement("button");b.type="button";b.textContent=label;b.className=className;b.addEventListener("click",handler);return b;}
function expenseItemRow(item){
 const row=document.createElement("article");row.className="expenses-detail-row";
 const left=document.createElement("div"),name=document.createElement("strong"),date=document.createElement("small"),right=document.createElement("div"),amount=document.createElement("b");
 name.textContent=item.descricao||"Sem descrição";date.textContent=expenseDate(item).split("-").reverse().join("/");amount.textContent=money(item.valor);
 const remove=makeExpenseButton("Excluir","finance-delete",async()=>{if(!confirm("Excluir somente este lançamento?"))return;remove.disabled=true;try{await withTimeout(deleteDoc(doc(db,"usuarios",currentUid,"despesas",item.id)))}catch(err){alert("Não foi possível excluir o lançamento.");remove.disabled=false;}});
 left.append(name,date);right.append(amount,remove);row.append(left,right);return row;
}
let openExpenseCategory=null;
function fillExpenseDetails(category){
 openExpenseCategory=category;
 $("expensesDetailsTitle").textContent=category;
 $("expensesDetailsPeriod").textContent="Período: "+expensePeriodLabel();
 const list=$("expensesDetailsList");list.replaceChildren();
 const items=entries.despesas.filter(e=>(expenseCategories.includes(e.categoria)?e.categoria:"Outros")===category&&expenseMatches(e)).sort((a,b)=>expenseDate(b).localeCompare(expenseDate(a)));
 if(!items.length){const p=document.createElement("p");p.className="muted";p.textContent="Nenhuma despesa nesse período.";list.append(p);}
 else items.forEach(item=>list.append(expenseItemRow(item)));
}
function renderExpenseCategories(){
 const root=$("despesasLista");root.replaceChildren();root.classList.add("expenses-category-grid");
 for(const category of expenseCategories){
  const items=entries.despesas.filter(e=>(expenseCategories.includes(e.categoria)?e.categoria:"Outros")===category&&expenseMatches(e));
  const card=document.createElement("article");card.className="expenses-category-card";
  const heading=document.createElement("div"),title=document.createElement("strong"),total=document.createElement("b"),note=document.createElement("small"),actions=document.createElement("div");
  heading.className="expenses-category-heading";title.textContent=category;total.textContent=money(items.reduce((n,e)=>n+Number(e.valor||0),0));
  note.textContent=items.length+" lançamento"+(items.length===1?"":"s");actions.className="expenses-category-actions";
  const open=makeExpenseButton("Abrir despesa","soft",()=>{$("expensesDetailsDialog").showModal();fillExpenseDetails(category);});
  actions.append(open);heading.append(title,total);card.append(heading,note,actions);root.append(card);
 }
 if(openExpenseCategory&&$("expensesDetailsDialog").open)fillExpenseDetails(openExpenseCategory);
}
function buildExpenseMonths(){
 $("expensesYearButton").textContent=expenseDraftYear+" ▾";
 const root=$("expensesMonthOptions");root.replaceChildren();
 expenseMonths.forEach((name,i)=>{const key=expenseDraftYear+"-"+String(i+1).padStart(2,"0");const b=makeExpenseButton(name,expenseDraftMonths.has(key)?"expenses-month selected":"expenses-month",()=>{if(expenseDraftMonths.has(key))expenseDraftMonths.delete(key);else expenseDraftMonths.add(key);buildExpenseMonths();});b.setAttribute("aria-pressed",String(expenseDraftMonths.has(key)));root.append(b);});
}
function initExpensePicker(){
 const picker=$("expensesPeriodPicker"),years=$("expensesYearOptions");
 $("expensesPeriodButton").addEventListener("click",()=>{picker.hidden=!picker.hidden;$("expensesPeriodButton").setAttribute("aria-expanded",String(!picker.hidden));years.hidden=true;buildExpenseMonths();});
 $("expensesYearButton").addEventListener("click",()=>{years.hidden=!years.hidden;$("expensesYearButton").setAttribute("aria-expanded",String(!years.hidden));if(years.hidden)return;years.replaceChildren();const current=new Date().getFullYear();for(let y=current+5;y>=current-20;y--){years.append(makeExpenseButton(String(y),"expenses-year",()=>{expenseDraftYear=y;years.hidden=true;buildExpenseMonths();}));}});
 $("expensesApplyPeriod").addEventListener("click",()=>{if(!expenseDraftMonths.size){$("expensesPeriodStatus").textContent="Selecione pelo menos um mês ou use Todos os meses.";return;}expenseAppliedPeriods=new Set(expenseDraftMonths);picker.hidden=true;$("expensesPeriodButton").setAttribute("aria-expanded","false");setExpensePeriodStatus();renderExpenseCategories();});
 $("expensesClearPeriod").addEventListener("click",()=>{expenseAppliedPeriods=null;expenseDraftMonths.clear();picker.hidden=true;$("expensesPeriodButton").setAttribute("aria-expanded","false");setExpensePeriodStatus();renderExpenseCategories();});
 $("expensesCloseDialog").addEventListener("click",()=>$("expensesDetailsDialog").close());
 $("expensesDetailsDialog").addEventListener("close",()=>openExpenseCategory=null);
 document.addEventListener("click",e=>{if(!e.composedPath().some(node=>node instanceof Element&&node.classList.contains("expenses-period-wrap"))){picker.hidden=true;$("expensesPeriodButton").setAttribute("aria-expanded","false");years.hidden=true;}});
 setExpensePeriodStatus();
}
initExpensePicker();

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
  if(kind==="receitas"){data.cliente=$("receitaCliente").value.trim();data.categoria=$("receitaCategoria").value;}else data.categoria=$("despesaCategoria").value;
  const button=form.querySelector('button[type="submit"]');button.disabled=true;$(kind+"Status").textContent="Salvando…";
  try{await withTimeout(addDoc(collection(db,"usuarios",currentUid,kind),data));form.reset();$(prefix+"Data").value=new Date().toLocaleDateString("en-CA");$(kind+"Status").textContent="Lançamento salvo."}
  catch(err){$(kind+"Status").textContent=err.message==="timeout"?"O banco demorou a responder. Confira a conexão e verifique se o registro foi salvo antes de tentar novamente.":"Falha ao salvar. Confira as regras e a criação do Firestore.";console.warn(err)}
  finally{button.disabled=false}
 });
 const date=$(kind==="receitas"?"receitaData":"despesaData");date.value=new Date().toLocaleDateString("en-CA");
}
onAuthStateChanged(auth,subscribe);
