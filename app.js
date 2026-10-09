// Interface apenas. Sem login, Firebase, API, persistencia ou banco de dados.
(() => {
 const buttons=[...document.querySelectorAll('[data-page]')];
 function open(page){
  document.querySelectorAll('.page').forEach(node=>node.hidden=node.id!==`page-${page}`);
  buttons.forEach(button=>{if(button.dataset.page===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  document.getElementById('main')?.scrollTo(0,0);
 }
 buttons.forEach(button=>button.addEventListener('click',()=>open(button.dataset.page)));
 const collapse=document.getElementById('sidebarCollapse');
 collapse?.addEventListener('click',()=>{const collapsed=document.body.classList.toggle('sidebar-collapsed');collapse.setAttribute('aria-pressed',String(collapsed));});
 document.getElementById('themeSelect')?.addEventListener('change',event=>{document.documentElement.dataset.theme=event.target.value;document.body.dataset.theme=event.target.value;});
 window.lucide?.createIcons();
 open('inicio');
})();
