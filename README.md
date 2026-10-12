[README.md](https://github.com/user-attachments/files/33337232/README.md)[Upl# Conecta Incentivos — versão GitHub + Supabase

Este repositório é uma evolução do `index.html` original, mantendo o layout e retirando os três projetos fictícios do catálogo público.

## Configuração

1. Copie `config.example.js` para `config.js`.
2. Abra **Supabase → Project Settings → API Keys** do projeto `knkfyfbgovsszmzxkntg` e insira **apenas** a chave **publishable** (ou anon pública) em `config.js`.
3. Sirva a pasta por HTTP (por exemplo, `python -m http.server 8000`), ou publique via GitHub Pages quando autorizado.
4. Configure as URLs de redirecionamento do Supabase Auth para o domínio escolhido antes de usar fluxos de e-mail.

**Nunca inclua `service_role` ou `sb_secret_` no frontend.** A chave publicável é destinada ao navegador, e as políticas RLS do Supabase são obrigatórias.

## Recursos implementados

- Consulta pública apenas de projetos `verified` + `published` no Supabase real.
- Login por e-mail e senha via Supabase Auth, sessão e logout.
- Identificação do administrador por `admin_users` e moderação via RPC `review_project`.
- Cadastro de projetos como rascunho sujeito à aprovação, apenas para usuários vinculados a organização proponente.
- Manifestação de interesse apenas por organizações patrocinadoras; nunca conta como captação confirmada.
- Remoção dos projetos fictícios e das mensagens de falsa persistência/criptografia.

## Limitações e próximos passos

- É necessário criar e vincular organizações proponentes/patrocinadoras por um fluxo de onboarding ainda não incluído nesta etapa.
- `config.js` não está incluído neste pacote; crie a partir do exemplo. Sem ele o portal exibe mensagem de configuração pendente.
- Não foram executados testes de login com senha nem testes end-to-end; nenhuma senha de usuário foi solicitada.
- A interface do simulador é orientativa e deve passar por revisão jurídica/contábil antes da produção.
- Valide os nomes de tabelas, RLS e a RPC no projeto Supabase antes de publicar.
- GitHub Pages não oferece armazenamento de segredos; **nunca** coloque chaves privadas em arquivos publicados.
oading README.md…]()
