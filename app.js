// Navegação visual, menu de configurações e tema. Autenticação em firebase.js.
(() => {
 const buttons=[...document.querySelectorAll('[data-page]')];
 const menu=document.getElementById('settingsMenu'), toggle=document.getElementById('settingsToggle');
 function closeSettings(){if(menu)menu.hidden=true;toggle?.setAttribute('aria-expanded','false')}
 function open(page){
  document.querySelectorAll('.page').forEach(node=>node.hidden=node.id!==`page-${page}`);
  buttons.forEach(b=>b.dataset.page===page?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  closeSettings(); window.scrollTo(0,0);
 }
 buttons.forEach(b=>b.addEventListener('click',()=>open(b.dataset.page)));
 toggle?.addEventListener('click',e=>{e.stopPropagation();menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden))});
 document.addEventListener('click',e=>{if(!e.target.closest('.settings-anchor'))closeSettings()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSettings()});
 const collapse=document.getElementById('sidebarCollapse');
 collapse?.addEventListener('click',()=>{const collapsed=document.body.classList.toggle('sidebar-collapsed');collapse.setAttribute('aria-pressed',String(collapsed))});
 const themeSelect=document.getElementById('themeSelect');
 function setTheme(theme){document.body.classList.toggle('dark',theme==='escuro');document.body.classList.toggle('fiorino2010',theme==='fiorino2010');document.documentElement.dataset.theme=theme;themeSelect.value=theme;localStorage.setItem('fiorino-theme',theme)}
 themeSelect?.addEventListener('change',e=>setTheme(e.target.value));
 const saved=localStorage.getItem('fiorino-theme');setTheme(['claro','escuro','fiorino2010'].includes(saved)?saved:'claro');
 window.lucide?.createIcons(); open('inicio');
})();
