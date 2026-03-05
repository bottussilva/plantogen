# Manual do Aplicativo

## Instalação
1. Clone o repositório.
2. Execute `npm install`.
3. Configure o banco de dados no Supabase usando o script em `supabase/migrations/`.
4. Crie o arquivo `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Execute `npm run dev`.

## Operação
- **Início**: Insira seu nome.
- **Escala**: Use o calendário para atribuir plantões ou a aba "Período" para preenchimento em lote. Os dados são salvos imediatamente no banco.
- **Configuração**: Ajuste os dados da área e clique em "Salvar Configurações" para persistir no Supabase.

## Teste
- Execute `npm run test` para rodar os testes unitários (utiliza mocks para o Supabase).
- Execute `npm run lint` para verificar a integridade do código.

## Configuração e Persistência
- Os dados são persistidos no **Supabase**.
- Garanta que as Row Level Security (RLS) estejam habilitadas para as tabelas para garantir a segurança dos dados.

## Deleção
- Para limpar os dados de um mês específico, use o botão "Limpar Escala Mensal". Isso removerá as entradas correspondentes do banco de dados para o mês selecionado.
