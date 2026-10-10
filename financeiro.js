import {getApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFirestore,collection,addDoc,deleteDoc,updateDoc,doc,onSnapshot,query} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const auth=getAuth(getApp()),db=getFirestore(getApp()),$=id=>document.getElementById(id);
function withTimeout(promise,ms=15000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("timeout")),ms)})]).finally(()=>clearTimeout(timer))}
const money=n=>(Number(n)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
let entries={receitas:[],despesas:[]},stop=[],currentUid=null;
function totals(){
 const sum=kind=>entries[kind].reduce((acc,e)=>acc+Number(e.valor||0),0);
 const r=sum("receitas"),d=sum("despesas");
 $("resumoReceitas").textContent=money(r);$("resumoDespesas").textContent=money(d);$("resumoSaldo").textContent=money(r-d);renderFuelBestPrices();
}
function render(kind){
 if(kind==="despesas"){renderExpenseCategories();return;}
 if(kind==="receitas"){renderIncomeCategories();return;}
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
function setExpensePeriodStatus(){ const label=expensePeriodLabel(); $("expensesPeriodStatus").textContent=""; $("expensesPeriodButton").textContent=(expenseAppliedPeriods===null?"Selecionar mês":label)+" ▾"; $("expensesPeriodButton").setAttribute("aria-label",expenseAppliedPeriods===null?"Selecionar mês":"Período selecionado: "+label+". Alterar meses");}
function makeExpenseButton(label,className,handler){let b=document.createElement("button");b.type="button";b.textContent=label;b.className=className;b.addEventListener("click",handler);return b;}
function expenseItemRow(item){
 const row=document.createElement("article");row.className="expenses-detail-row";
 const left=document.createElement("div"),name=document.createElement("strong"),date=document.createElement("small"),right=document.createElement("div"),amount=document.createElement("b");
 name.textContent=item.descricao||"Sem descrição";date.textContent=expenseDate(item).split("-").reverse().join("/");if(item.categoria==="Combustível"&&Number(item.precoLitro)>0)date.textContent+=" • "+money(item.precoLitro)+"/litro";amount.textContent=money(item.valor);
 const remove=makeExpenseButton("Excluir","finance-delete",async()=>{if(!confirm("Excluir somente este lançamento?"))return;remove.disabled=true;try{await withTimeout(deleteDoc(doc(db,"usuarios",currentUid,"despesas",item.id)))}catch(err){alert("Não foi possível excluir o lançamento.");remove.disabled=false;}});
 const edit=document.createElement("button");edit.type="button";edit.className="finance-edit-button";edit.textContent="Editar";edit.addEventListener("click",()=>openEditEntry("despesas",item));
 const actions=document.createElement("div");actions.className="finance-detail-actions";actions.append(edit,remove);
 left.append(name,date);right.append(amount,actions);row.append(left,right);return row;
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
const incomeCategories=["Frete","Aporte de capital","Venda de bens","Reembolso","Outras entradas"];
const incomeMonths=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
let incomeDraftYear=new Date().getFullYear(),incomeDraftMonths=new Set(),incomeAppliedPeriods=null;
const incomeDate=e=>typeof e.data==="string"?e.data:"";
function incomeMatches(e){return incomeAppliedPeriods===null||incomeAppliedPeriods.has(incomeDate(e).slice(0,7));}
function incomePeriodLabel(){if(incomeAppliedPeriods===null)return "Todos os meses";let keys=[...incomeAppliedPeriods].sort();return keys.length?keys.map(k=>incomeMonths[Number(k.slice(5))-1]+"/"+k.slice(0,4)).join(", "):"Nenhum mês selecionado";}
function setIncomePeriodStatus(){ const label=incomePeriodLabel(); $("incomePeriodStatus").textContent=""; $("incomePeriodButton").textContent=(incomeAppliedPeriods===null?"Selecionar mês":label)+" ▾"; $("incomePeriodButton").setAttribute("aria-label",incomeAppliedPeriods===null?"Selecionar mês":"Período selecionado: "+label+". Alterar meses");}
function makeIncomeButton(label,className,handler){let b=document.createElement("button");b.type="button";b.textContent=label;b.className=className;b.addEventListener("click",handler);return b;}
function incomeItemRow(item){
 const row=document.createElement("article");row.className="income-detail-row";
 const left=document.createElement("div"),name=document.createElement("strong"),date=document.createElement("small"),right=document.createElement("div"),amount=document.createElement("b");
 name.textContent=item.descricao||"Sem descrição";date.textContent=incomeDate(item).split("-").reverse().join("/");if((!item.categoria||item.categoria==="Frete")&&item.cliente?.trim())date.textContent+=" • Cliente: "+item.cliente.trim();amount.textContent=money(item.valor);
 const remove=makeIncomeButton("Excluir","finance-delete",async()=>{if(!confirm("Excluir somente este lançamento?"))return;remove.disabled=true;try{await withTimeout(deleteDoc(doc(db,"usuarios",currentUid,"receitas",item.id)))}catch(err){alert("Não foi possível excluir o lançamento.");remove.disabled=false;}});
 const edit=document.createElement("button");edit.type="button";edit.className="finance-edit-button";edit.textContent="Editar";edit.addEventListener("click",()=>openEditEntry("receitas",item));
 const actions=document.createElement("div");actions.className="finance-detail-actions";actions.append(edit,remove);
 left.append(name,date);right.append(amount,actions);row.append(left,right);return row;
}
let openIncomeCategory=null;
function fillIncomeDetails(category){
 openIncomeCategory=category;
 $("incomeDetailsTitle").textContent=category;
 $("incomeDetailsPeriod").textContent="Período: "+incomePeriodLabel();
 const list=$("incomeDetailsList");list.replaceChildren();
 const items=entries.receitas.filter(e=>(e.categoria==="Outros serviços"?"Outras entradas":incomeCategories.includes(e.categoria)?e.categoria:"Frete")===category&&incomeMatches(e)).sort((a,b)=>incomeDate(b).localeCompare(incomeDate(a)));
 if(!items.length){const p=document.createElement("p");p.className="muted";p.textContent="Nenhuma receita nesse período.";list.append(p);}
 else items.forEach(item=>list.append(incomeItemRow(item)));
}
function renderIncomeCategories(){
 const root=$("receitasLista");root.replaceChildren();root.classList.add("income-category-grid");
 for(const category of incomeCategories){
  const items=entries.receitas.filter(e=>(e.categoria==="Outros serviços"?"Outras entradas":incomeCategories.includes(e.categoria)?e.categoria:"Frete")===category&&incomeMatches(e));
  const card=document.createElement("article");card.className="income-category-card";
  const heading=document.createElement("div"),title=document.createElement("strong"),total=document.createElement("b"),note=document.createElement("small"),actions=document.createElement("div");
  heading.className="income-category-heading";title.textContent=category==="Frete"?"Fretes":category;total.textContent=money(items.reduce((n,e)=>n+Number(e.valor||0),0));
  note.textContent=items.length+" lançamento"+(items.length===1?"":"s");actions.className="income-category-actions";
  const open=makeIncomeButton("Abrir receita","soft",()=>{$("incomeDetailsDialog").showModal();fillIncomeDetails(category);});
  actions.append(open);heading.append(title,total);card.append(heading,note,actions);root.append(card);
 }
 if(openIncomeCategory&&$("incomeDetailsDialog").open)fillIncomeDetails(openIncomeCategory);
}
function buildIncomeMonths(){
 $("incomeYearButton").textContent=incomeDraftYear+" ▾";
 const root=$("incomeMonthOptions");root.replaceChildren();
 incomeMonths.forEach((name,i)=>{const key=incomeDraftYear+"-"+String(i+1).padStart(2,"0");const b=makeIncomeButton(name,incomeDraftMonths.has(key)?"income-month selected":"income-month",()=>{if(incomeDraftMonths.has(key))incomeDraftMonths.delete(key);else incomeDraftMonths.add(key);buildIncomeMonths();});b.setAttribute("aria-pressed",String(incomeDraftMonths.has(key)));root.append(b);});
}
function initIncomePicker(){
 const picker=$("incomePeriodPicker"),years=$("incomeYearOptions");
 $("incomePeriodButton").addEventListener("click",()=>{picker.hidden=!picker.hidden;$("incomePeriodButton").setAttribute("aria-expanded",String(!picker.hidden));years.hidden=true;buildIncomeMonths();});
 $("incomeYearButton").addEventListener("click",()=>{years.hidden=!years.hidden;$("incomeYearButton").setAttribute("aria-expanded",String(!years.hidden));if(years.hidden)return;years.replaceChildren();const current=new Date().getFullYear();for(let y=current+5;y>=current-20;y--){years.append(makeIncomeButton(String(y),"income-year",()=>{incomeDraftYear=y;years.hidden=true;buildIncomeMonths();}));}});
 $("incomeApplyPeriod").addEventListener("click",()=>{if(!incomeDraftMonths.size){$("incomePeriodStatus").textContent="Selecione pelo menos um mês ou use Todos os meses.";return;}incomeAppliedPeriods=new Set(incomeDraftMonths);picker.hidden=true;$("incomePeriodButton").setAttribute("aria-expanded","false");setIncomePeriodStatus();renderIncomeCategories();});
 $("incomeClearPeriod").addEventListener("click",()=>{incomeAppliedPeriods=null;incomeDraftMonths.clear();picker.hidden=true;$("incomePeriodButton").setAttribute("aria-expanded","false");setIncomePeriodStatus();renderIncomeCategories();});
 $("incomeCloseDialog").addEventListener("click",()=>$("incomeDetailsDialog").close());
 $("incomeDetailsDialog").addEventListener("close",()=>openIncomeCategory=null);
 document.addEventListener("click",e=>{if(!e.composedPath().some(node=>node instanceof Element&&node.classList.contains("income-period-wrap"))){picker.hidden=true;$("incomePeriodButton").setAttribute("aria-expanded","false");years.hidden=true;}});
 setIncomePeriodStatus();
}
initIncomePicker();

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
function renderFuelBestPrices(){
 const root=$("fuelBestPrices");root.replaceChildren();
 for(const tipo of ["Gasolina","Etanol"]){
  const matches=entries.despesas.filter(e=>e.categoria==="Combustível"&&e.combustivelTipo===tipo&&Number(e.precoLitro)>0&&e.descricao?.trim());
  const card=document.createElement("article");card.className="fuel-best-card";
  const title=document.createElement("strong"),detail=document.createElement("p"),price=document.createElement("b");
  title.textContent=tipo;
  if(matches.length){const best=matches.reduce((a,b)=>Number(a.precoLitro)<=Number(b.precoLitro)?a:b);price.textContent=money(best.precoLitro)+"/L";detail.textContent=best.descricao+" • "+(best.data||"").split("-").reverse().join("/");}
  else{price.textContent="Sem registros";detail.textContent="Cadastre um abastecimento com preço por litro.";}
  card.append(title,price,detail);root.append(card);
 }
}
// Campos monetários com centavos automáticos; os números gravados no Firestore não são strings.
const moneyInputs=["receitaValor","despesaValor","despesaPrecoLitro"];
const inputMoneyFormat=digits=>(Number(digits||"0")/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
function readInputMoney(id){
 const digits=$(id).value.replace(/\D/g,"");
 return Number(digits||"0")/100;
}
function resetInputMoney(kind){$(kind==="receitas"?"receitaValor":"despesaValor").value="0,00";if(kind==="despesas")$("despesaPrecoLitro").value="0,00";}
for(const id of moneyInputs){
 const el=$(id);
 el.addEventListener("input",()=>{
  const digits=el.value.replace(/\D/g,"").slice(-11);
  el.value=inputMoneyFormat(digits);
  el.setSelectionRange(el.value.length,el.value.length);
 });
 el.addEventListener("focus",()=>el.setSelectionRange(el.value.length,el.value.length));
 el.addEventListener("keydown",event=>{
  if(event.key==="Delete"){event.preventDefault();el.value="0,00";}
 });
}
function syncFuelFields(){
 const fuel=$("despesaCategoria").value==="Combustível";
 $("despesaDescricaoLabel").textContent=fuel?"Nome do posto":"Descrição";
 $("despesaDescricao").placeholder=fuel?"Ex.: Posto Marajó":"Ex.: Descrição";
 document.querySelectorAll("#despesasForm .fuel-only-field").forEach(el=>el.hidden=!fuel);
 for(const id of ["despesaCombustivelTipo","despesaPrecoLitro"])$(id).disabled=!fuel;
 $("despesaPrecoLitro").required=fuel;
}
$("despesaCategoria").addEventListener("change",syncFuelFields);
syncFuelFields();

let editEntryContext=null;
const editDialog=$("financeEditDialog"),editForm=$("financeEditForm");
function editField(name,label,value,opts={}){
 const wrapper=document.createElement("label");wrapper.className="finance-edit-field";wrapper.textContent=label;
 let input;
 if(opts.options){input=document.createElement("select");for(const option of opts.options){const el=document.createElement("option");el.value=option;el.textContent=option;input.append(el);}}
 else {input=document.createElement("input");input.type=opts.type||"text";if(opts.type==="number"){input.step=opts.step||"0.01";input.min="0.01";}if(opts.money){input.type="text";input.inputMode="numeric";input.autocomplete="off";input.value=(Math.round(Number(value||0)*100)/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});input.addEventListener("input",()=>{const digits=input.value.replace(/\D/g,"").slice(-11);input.value=(Number(digits||"0")/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});input.setSelectionRange(input.value.length,input.value.length);});}if(opts.maxLength)input.maxLength=opts.maxLength;}
 input.name=name;if(!opts.money)input.value=value??"";if(opts.required)input.required=true;wrapper.append(input);return wrapper;
}
function openEditEntry(kind,item){
 editEntryContext={kind,id:item.id,original:item};
 $("financeEditTitle").textContent=kind==="receitas"?"Editar receita":"Editar despesa";
 const fields=$("financeEditFields");fields.replaceChildren();
 fields.append(editField("descricao",item.categoria==="Combustível"?"Nome do posto":"Descrição",item.descricao,{required:true,maxLength:120}));
 if(kind==="receitas" && (!item.categoria||item.categoria==="Frete"))fields.append(editField("cliente","Cliente (opcional)",item.cliente||"",{maxLength:100}));
 if(kind==="despesas" && item.categoria==="Combustível"){
  fields.append(editField("combustivelTipo","Tipo de combustível",item.combustivelTipo||"Gasolina",{options:["Gasolina","Etanol"]}));
  fields.append(editField("precoLitro","Preço por litro (R$)",item.precoLitro??"",{money:true,required:true}));
 }
 fields.append(editField("valor","Valor (R$)",item.valor,{money:true,required:true}));
 fields.append(editField("data","Data",item.data,{type:"date",required:true}));
 $("financeEditStatus").textContent="";
 editDialog.showModal();
}
editForm.addEventListener("submit",async event=>{
 event.preventDefault();
 if(!editEntryContext||!currentUid)return;
 const {kind,id,original}=editEntryContext,values=Object.fromEntries(new FormData(editForm));
 const parseMoney=value=>Number((value||"").replace(/\D/g,"")||"0")/100;
 const valor=parseMoney(values.valor),preco=parseMoney(values.precoLitro);
 if(!values.descricao?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(values.data)||!Number.isFinite(valor)||valor<=0||valor>=1000000000){$("financeEditStatus").textContent="Confira descrição, valor e data.";return;}
 if(original.categoria==="Combustível"&&(!Number.isFinite(preco)||preco<=0||preco>=1000)){$("financeEditStatus").textContent="Informe um preço por litro válido.";return;}
 const changes={descricao:values.descricao.trim(),valor:Math.round(valor*100)/100,data:values.data};
 if(kind==="receitas"&&(!original.categoria||original.categoria==="Frete"))changes.cliente=values.cliente?.trim()||"";
 if(kind==="despesas"&&original.categoria==="Combustível"){changes.combustivelTipo=values.combustivelTipo;changes.precoLitro=preco;}
 const save=$("financeEditSave");save.disabled=true;$("financeEditStatus").textContent="Salvando alterações…";
 try{await withTimeout(updateDoc(doc(db,"usuarios",currentUid,kind,id),changes));editDialog.close();editEntryContext=null;}
 catch(err){$("financeEditStatus").textContent=err.code==="permission-denied"?"Edição bloqueada pelas regras do Firebase. É necessário publicar a regra que autoriza atualizar os próprios lançamentos.":"Falha ao editar: "+(err.code||err.message);console.warn(err);}
 finally{save.disabled=false;}
});
$("financeEditCancel").addEventListener("click",()=>editDialog.close());
editDialog.addEventListener("close",()=>editEntryContext=null);

function syncReceitaCliente(){const show=$("receitaCategoria").value==="Frete";$("receitaClienteField").hidden=!show;$("receitaCliente").disabled=!show;}
$("receitaCategoria").addEventListener("change",syncReceitaCliente);
syncReceitaCliente();
for(const kind of ["receitas","despesas"]){
 const form=$(kind+"Form");form.addEventListener("invalid",ev=>{$(kind+"Status").textContent="Confira o campo "+(ev.target.labels?.[0]?.textContent||"obrigatório")+" antes de salvar.";},true);
 form.addEventListener("submit",async ev=>{
  ev.preventDefault();if(!currentUid)return;
  const prefix=kind==="receitas"?"receita":"despesa";
  const value=readInputMoney(prefix+"Valor"),description=$(prefix+"Descricao").value.trim(),date=$(prefix+"Data").value;
  if(!description||!date||!Number.isFinite(value)||value<=0){$(kind+"Status").textContent="Confira a descrição, o valor e a data.";return;}
  const data={descricao:description,valor:Math.round(value*100)/100,data:date};
  if(kind==="receitas"){data.categoria=$("receitaCategoria").value;if(data.categoria==="Frete")data.cliente=$("receitaCliente").value.trim();}else{data.categoria=$("despesaCategoria").value;if(data.categoria==="Combustível"){const preco=readInputMoney("despesaPrecoLitro");if(!Number.isFinite(preco)||preco<=0){$("despesasStatus").textContent="Informe o preço do litro.";return;}data.combustivelTipo=$("despesaCombustivelTipo").value;data.precoLitro=preco;}}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;$(kind+"Status").textContent="Salvando…";
  try{await withTimeout(addDoc(collection(db,"usuarios",currentUid,kind),data));form.reset();resetInputMoney(kind);if(kind==="receitas")syncReceitaCliente();else syncFuelFields();$(prefix+"Data").value=new Date().toLocaleDateString("en-CA");$(kind+"Status").textContent="Lançamento salvo."}
  catch(err){$(kind+"Status").textContent=err.message==="timeout"?"O banco demorou a responder. Confira a conexão e verifique se o registro foi salvo antes de tentar novamente.":"Falha ao salvar ("+(err.code||"erro de conexão")+"). Confira a conexão e as permissões.";console.warn(err)}
  finally{button.disabled=false}
 });
 const date=$(kind==="receitas"?"receitaData":"despesaData");date.value=new Date().toLocaleDateString("en-CA");
}
onAuthStateChanged(auth,subscribe);
