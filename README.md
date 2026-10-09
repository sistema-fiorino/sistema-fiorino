# Sistema Fiorino — base visual com Firebase configurado

Base visual independente, derivada dos arquivos fornecidos pelo usuário.

## O que funciona
- Interface, menu e navegação, inclusive telas vazias.
- Alternância visual de tema.
- Inicialização do Firebase **somente do aplicativo Web** com o projeto `sistema-fiorino`, em `js/firebase.js`.

## O que ainda não está habilitado
- Firebase Authentication / login.
- Cloud Firestore / Realtime Database e qualquer leitura/gravação de dados.
- Firebase Storage.
- Regras de segurança e funcionalidades de negócio.

**Importante:** inicializar o Firebase não significa que o Firestore esteja criado nem que uma ligação com o banco tenha sido testada. Não use regras públicas para liberar acesso.

## Como executar
Utilize um servidor estático local (módulos JavaScript necessitam de HTTP, não `file://`):

```bash
cd sistema-fiorino-base
python -m http.server 8000
```

Abra `http://localhost:8000`. Requer internet para carregar o SDK Firebase, a fonte e os ícones. Abra as ferramentas do navegador (F12) para verificar a inicialização no console.

## Arquivos principais
- `index.html`: estrutura visual e carregamento dos scripts.
- `styles.css` / `clean.css`: estilos.
- `js/app.js`: navegação visual.
- `js/firebase.js`: configuração e inicialização do aplicativo Firebase.

Nenhuma conexão com o Firebase do NUNES Financeiro foi mantida; o repositório original não foi modificado.
