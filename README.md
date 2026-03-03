# PlantoGen APM - Gestão de Sobreaviso

Versão: **1.0.0**

## 📝 Propósito
O PlantoGen APM é uma aplicação web responsiva projetada para facilitar a gestão de escalas de sobreaviso e gerar planilhas automatizadas no padrão APM.

## 📖 Manual do Aplicativo
### Início
1. Insira seu nome.
2. Clique em "Iniciar Aplicativo".

### Funcionalidades
- **Equipe**: Cadastre profissionais com matrícula e especialidade.
- **Período**: Cadastre sobreavisos em lote selecionando início, fim e turno.
- **Área**: Configure os dados da unidade e gerência para a planilha oficial.
- **Exportação**: Gere planilhas .xlsx no padrão APM ou certificados de conclusão em PDF.
- **Áudio**: Feedback sonoro para acertos, erros e interações.

## 🚀 Procedimentos de Implantação
A aplicação pode ser implantada seguindo os pré-requisitos:
- Node.js 20+
- Docker/Podman

### Ambiente Local
```bash
npm install
npm run dev
```

### Docker / Podman
```bash
docker build -t plantogen .
docker run -p 8080:8080 plantogen
```

## 📂 Dicionário de Arquivos
- `src/App.tsx`: Lógica principal e interface da aplicação.
- `src/utils/logger.ts`: Utilitário de log para rastreamento de eventos e erros.
- `src/tests/`: Testes automatizados (Vitest).
- `Dockerfile`: Configuração para containerização.
- `nginx.conf`: Configuração do servidor web para produção.
- `package.json`: Dependências e scripts do projeto.

## 🤝 Padrão de Commits
O projeto segue a convenção **Conventional Commits**:
- `feat`: Nova funcionalidade.
- `fix`: Correção de bugs.
- `docs`: Alterações em documentação.
- `test`: Adição de testes.
- `chore`: Atualização de tarefas de build ou dependências.

## 📜 Licença
Este software está licenciado sob a **GNU GPLv3**.

## 📅 Changelog
### [1.0.0] - 2026-03-02
- Implementação inicial conforme requisitos APM.
- Adição de infraestrutura Docker.
- Implementação de utilitário de log e testes unitários.
- Melhorias de acessibilidade e segurança (sanitização).
