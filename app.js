// Navegação, tema e controle financeiro. Autenticação permanece em firebase.js.
(() => {
 const buttons=[...document.querySelectorAll('[data-page]')];
 const menu=document.getElementById('settingsMenu'), toggle=document.getElementById('settingsToggle');
 function closeSettings(){if(menu)menu.hidden=true;toggle?.setAttribute('aria-expanded','false')}
 function open(page){
  document.querySelectorAll('.page').forEach(node=>node.hidden=node.id!=='page-'+page);
  buttons.forEach(b=>b.dataset.page===page?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  closeSettings(); window.scrollTo(0,0);
  if(page==='financas') window.loadFiorinoFinance?.();
 }
 buttons.forEach(b=>b.addEventListener('click',()=>open(b.dataset.page)));
 toggle?.addEventListener('click',e=>{e.stopPropagation();menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden))});
 document.addEventListener('click',e=>{if(!e.target.closest('.settings-anchor'))closeSettings()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSettings()});
 const collapse=document.getElementById('sidebarCollapse');
 collapse?.addEventListener('click',()=>{const collapsed=document.body.classList.toggle('sidebar-collapsed');collapse.setAttribute('aria-pressed',String(collapsed))});
 const themeSelect=document.getElementById('themeSelect');
 function setTheme(theme){document.body.classList.toggle('dark',theme==='escuro');document.documentElement.dataset.theme=theme;if(themeSelect)themeSelect.value=theme;try{localStorage.setItem('fiorino-theme',theme)}catch{}}
 themeSelect?.addEventListener('change',e=>setTheme(e.target.value));
 let savedTheme='claro';try{savedTheme=localStorage.getItem('fiorino-theme')||'claro'}catch{}
 setTheme(savedTheme==='escuro'?'escuro':'claro');

 const $=id=>document.getElementById(id);
 const form=$('transactionForm');
 if(form){
  const description=$('transactionDescription'),amount=$('transactionAmount'),date=$('transactionDate'),category=$('transactionCategory'),notes=$('transactionNotes');
  const month=$('financeMonth'),typeFilter=$('financeTypeFilter'),search=$('financeSearch');
  const now=new Date(),todayLocal=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
  let activeType='receita',entries=[],storageKey='',editingId='';
  const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
  const prettyDate=s=>{if(!s)return 'Sem data';const p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0]};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
  const keyForUser=()=>{const email=$('accountEmail')?.textContent?.trim().toLowerCase()||'conta-local';return 'sistema-fiorino-financas-v1:'+encodeURIComponent(email)};
  const categoryOptions={
   receita:['Frete recebido','Adiantamento de frete','Serviço extra','Venda de item','Outros recebimentos'],
   despesa:['Combustível','Manutenção','Reforma','Documentação','Seguro','Pedágio','Alimentação','Estacionamento','Impostos e taxas','Parcela do veículo','Outros']
  };
  function setType(type){
   activeType=type;
   document.querySelectorAll('[data-transaction-type]').forEach(b=>{const selected=b.dataset.transactionType===type;b.classList.toggle('is-income',selected&&type==='receita');b.classList.toggle('is-expense',selected&&type==='despesa');b.setAttribute('aria-pressed',String(selected))});
   const previous=category.value;
   category.replaceChildren(...categoryOptions[type].map(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;return o}));
   if(categoryOptions[type].includes(previous))category.value=previous;
   $('saveTransactionButton').innerHTML=editingId?'<i data-lucide="check"></i> Salvar alterações':'<i data-lucide="plus"></i> Salvar '+type;
   window.lucide?.createIcons();
  }
  function persist(){
   try{localStorage.setItem(storageKey,JSON.stringify(entries));return true}
   catch(e){$('financeFormMessage').textContent='Não foi possível salvar neste navegador. Verifique o espaço disponível.';return false}
  }
  function loadFinance(){
   const nextKey=keyForUser();
   if(nextKey!==storageKey){
    storageKey=nextKey;entries=[];
    try{const parsed=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(parsed))entries=parsed.filter(x=>x&&x.id&&['receita','despesa'].includes(x.type))}
    catch{entries=[]}
    month.value=month.value||todayLocal.slice(0,7);
   }
   render();
  }
  window.loadFiorinoFinance=loadFinance;
  function resetForm(){
   editingId='';form.reset();date.value=todayLocal;$('transactionId').value='';
   $('transactionFormTitle').textContent='Adicionar movimentação';
   $('saveTransactionButton').innerHTML='<i data-lucide="plus"></i> Salvar lançamento';
   $('cancelEditButton').hidden=true;$('financeFormMessage').textContent='';
   setType('receita');window.lucide?.createIcons();
  }
  function beginEdit(id){
   const item=entries.find(x=>x.id===id);if(!item)return;
   editingId=id;$('transactionId').value=id;setType(item.type);
   description.value=item.description;amount.value=String(item.amount);date.value=item.date;notes.value=item.notes||'';
   category.value=item.category;$('transactionFormTitle').textContent='Editar movimentação';
   $('saveTransactionButton').innerHTML='<i data-lucide="check"></i> Salvar alterações';
   $('cancelEditButton').hidden=false;$('financeFormMessage').textContent='Editando lançamento selecionado.';
   window.lucide?.createIcons();form.scrollIntoView({behavior:'smooth',block:'start'});description.focus({preventScroll:true});
  }
  function render(){
   const selectedMonth=month.value;
   const periodEntries=entries.filter(x=>!selectedMonth||x.date?.startsWith(selectedMonth));
   const income=periodEntries.filter(x=>x.type==='receita').reduce((sum,x)=>sum+Number(x.amount),0);
   const expense=periodEntries.filter(x=>x.type==='despesa').reduce((sum,x)=>sum+Number(x.amount),0);
   $('incomeTotal').textContent=money(income);$('expenseTotal').textContent=money(expense);
   $('balanceTotal').textContent=money(income-expense);$('balanceTotal').classList.toggle('negative',income-expense<0);
   $('balanceCaption').textContent=income-expense<0?'Despesas acima das receitas':'Receitas menos despesas';
   const filtered=periodEntries.filter(x=>(typeFilter.value==='todos'||x.type===typeFilter.value)&&(x.description+' '+x.category+' '+(x.notes||'')).toLocaleLowerCase('pt-BR').includes(search.value.trim().toLocaleLowerCase('pt-BR')))
    .sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0));
   $('transactionCount').textContent=filtered.length+' '+(filtered.length===1?'lançamento':'lançamentos');
   $('financePeriodLabel').textContent=selectedMonth?new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(selectedMonth+'-15T12:00:00')):'Todos os períodos';
   const filteredNet=filtered.reduce((sum,x)=>sum+(x.type==='receita'?1:-1)*Number(x.amount),0);
   $('financeNetLabel').textContent='Saldo da lista: '+money(filteredNet);
   const list=$('transactionList'),empty=$('financeEmptyState');
   if(!filtered.length){list.innerHTML='';empty.hidden=false;return}
   empty.hidden=true;
   list.innerHTML=filtered.map(x=>'<article class="transaction-row '+(x.type==='receita'?'transaction-income':'transaction-expense')+'">'+
    '<span class="transaction-kind-icon"><i data-lucide="'+(x.type==='receita'?'arrow-down-left':'arrow-up-right')+'"></i></span>'+
    '<div class="transaction-info"><strong>'+esc(x.description)+'</strong><span>'+esc(x.category)+' · '+prettyDate(x.date)+'</span>'+(x.notes?'<small>'+esc(x.notes)+'</small>':'')+'</div>'+
    '<div class="transaction-value"><strong>'+(x.type==='receita'?'+':'−')+' '+money(x.amount)+'</strong><div class="transaction-actions"><button type="button" data-edit="'+esc(x.id)+'" aria-label="Editar '+esc(x.description)+'" title="Editar"><i data-lucide="pencil"></i></button><button type="button" data-delete="'+esc(x.id)+'" aria-label="Excluir '+esc(x.description)+'" title="Excluir"><i data-lucide="trash-2"></i></button></div></div></article>').join('');
   window.lucide?.createIcons();
  }
  document.querySelectorAll('[data-transaction-type]').forEach(b=>b.addEventListener('click',()=>setType(b.dataset.transactionType)));
  form.addEventListener('submit',e=>{
   e.preventDefault();const value=Number(amount.value);
   if(!description.value.trim()||!date.value||!Number.isFinite(value)||value<=0){$('financeFormMessage').textContent='Informe descrição, data e um valor maior que zero.';return}
   if(!storageKey)loadFinance();
   const existing=entries.find(x=>x.id===editingId);
   const item={id:editingId||uid(),type:activeType,description:description.value.trim(),amount:Math.round(value*100)/100,date:date.value,category:category.value,notes:notes.value.trim(),createdAt:existing?.createdAt||Date.now(),updatedAt:Date.now()};
   if(editingId)entries=entries.map(x=>x.id===editingId?item:x);else entries.push(item);
   if(!persist())return;
   resetForm();render();$('financeFormMessage').textContent='Lançamento salvo com sucesso.';
  });
  $('cancelEditButton').addEventListener('click',resetForm);
  $('newTransactionTop').addEventListener('click',()=>{resetForm();form.scrollIntoView({behavior:'smooth',block:'start'});description.focus({preventScroll:true})});
  $('newTransactionEmpty').addEventListener('click',()=>$('newTransactionTop').click());
  [month,typeFilter,search].forEach(el=>el.addEventListener('input',render));
  $('transactionList').addEventListener('click',e=>{
   const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');
   if(edit){beginEdit(edit.dataset.edit);return}
   if(del){const item=entries.find(x=>x.id===del.dataset.delete);if(!item)return;
    if(!window.confirm('Excluir o lançamento "'+item.description+'" de '+money(item.amount)+'?'))return;
    entries=entries.filter(x=>x.id!==item.id);if(!persist())return;
    if(editingId===item.id)resetForm();render();
   }
  });
  date.value=todayLocal;month.value=todayLocal.slice(0,7);setType('receita');
 }
 window.lucide?.createIcons();open('inicio');
})();