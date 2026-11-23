# Vem pra Quadra

Sistema web simples para controle de alunos, presença, pagamentos, comprovantes e rotinas de exercícios.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie `index.html`, `script.js` e `styles.css` para a raiz do repositório.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/ (root)`, depois salve.
6. Aguarde a publicação e abra o endereço informado pelo GitHub.

## Dados e backup

* Os dados são gravados no `localStorage` do navegador, usando a chave `ginastica\_sistema\_v1`.
* A versão corrigida mantém essa mesma chave para reconhecer os dados já cadastrados neste navegador.
* Use **Exportar backup** para baixar um arquivo JSON.
* Use **Importar backup** para restaurar um JSON exportado pelo sistema. A importação substitui os dados atuais após confirmação.
* Para evitar perda de dados, exporte backups regularmente e antes de limpar os dados do navegador.

## Observações importantes

* O sistema funciona sem servidor e não sincroniza automaticamente entre computadores ou celulares. Cada navegador/dispositivo mantém sua própria cópia local.
* O gráfico de frequência utiliza Chart.js por CDN e precisa de conexão com a internet para carregar.
* Para sincronização entre vários dispositivos será necessário adicionar um banco de dados e uma camada de autenticação/API.

