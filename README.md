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
- Podman / Docker
- Instância Supabase (Self-hosted ou Cloud)

## ☁️ Integração com Supabase (Persistência)

O PlantoGen APM agora suporta persistência de dados real-time utilizando o **Supabase**. Siga os passos abaixo para configurar sua instância:

### 1. Configuração do Banco de Dados
Execute o script SQL localizado em `supabase/migrations/20260305000000_schema.sql` no seu editor SQL do Supabase. Isso criará as tabelas necessárias:
- `professionals`: Cadastro da equipe.
- `shifts`: Escalas de sobreaviso.
- `area_data`: Configurações da unidade/área.

### 2. Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto com as credenciais da sua instância:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### 3. Segurança (Essencial)
- **Rls (Row Level Security)**: Habilite RLS nas tabelas para controlar o acesso.
- **Anon Key**: A chave `anon` é segura para uso no frontend, mas garanta que as políticas de RLS estejam configuradas corretamente.
- **Segurança de Chaves**: Nunca faça commit do arquivo `.env.local`. Ele já está incluído no `.gitignore`.

### Ambiente Local (Node.js)
```bash
npm install
npm run dev
```

### Docker / Podman
O aplicativo foi estruturado para suportar nativamente containers, podendo utilizar as mesmas instruções em Docker ou Podman:
```bash
# Construção da imagem do container
docker build -t plantogen .
podman build -t plantogen .

# Execução do container em porta padrão
docker run -p 8080:8080 plantogen
podman run -p 8080:8080 plantogen
```

### Docker Compose
Para executar a versão utilizando o orquestrador padrão do Docker:
```bash
# Sobe o container em background (-d)
docker-compose up -d

# Derrubar a aplicação
docker-compose down
```

### Kubernetes (k8s)
Execute a aplicação num cluster Kubernetes através do manifest fornecido:
```bash
# Caso esteja utilizando minikube, realizar build interno (opcional)
# minikube image build -t plantogen:latest .

kubectl apply -f k8s-deployment.yaml
# Recuperar IP caso LoadBalancer ou expor a rota de serviço:
kubectl get services
```

### Google Cloud Run
Para o Google Cloud Run, a imagem deve ser publicada no Artifact Registry da GCP. O projeto exige a CLI do Google (`gcloud`) configurada e logada (`gcloud auth login`).
```bash
# Submeta o deploy do source local para a sua GCP
gcloud run deploy plantogen --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

### Google App Engine
Para realizar o deploy na App Engine, garanta que o arquivo `app.yaml` esteja no projeto e a conta autenticada na GCP. Habilite a API do GAE no Console de Administração.
```bash
# Faça o deploy da aplicação NodeJS
gcloud app deploy app.yaml
```

### AWS Lambda
A aplicação gera arquivos estáticos (`npm run build`). Embora lambdas sejam para funções de execução assíncrona/temporária, pode-se servi-los em lambdas pelo `serverless-http` num pacote zipado, ou via Web Adapter, mas nativamente sugere-se a hospedagem dos estáticos via AWS S3 acoplado a um CloudFront se a intenção for Serverless. Ou, encapsular o container num Lambda usando AWS ECR e função do tipo *Image*.

```bash
# Para Container em Lambda (requer CLI instalada e conta configurada):
aws ecr create-repository --repository-name plantogen
docker tag plantogen:latest <conta-aws>.dkr.ecr.<regiao>.amazonaws.com/plantogen:latest
docker push <conta-aws>.dkr.ecr.<regiao>.amazonaws.com/plantogen:latest
# Crie a função definindo o tipo e URI da Imagem criada no console da AWS Lambda.
```

## 🛠 Orientações para Ajustes e Customizações

Esta aplicação APM é flexível e permite uma série de ajustes locais de jogabilidade e operação para adequação local ("White-labeling"):

**Constantes, Cores e Tipos:**
Configurações como horas sobreaviso padrão, nome de unidade, siglas da empresa e opções padrão podem ser alteradas sem prejudicar a lógica. Todas são definidas no código-fonte, principalmente em `src/App.tsx` e `src/types/index.ts`. Para customizar as turmas, períodos ou cores de especialidade, modifique os arrays/enumerações associados.

*Exemplo: Adicionando nova Especialidade em Profissionais*
1. Localize os enums em `src/types` ou diretamente nas constantes onde as especialidades ("Suporte", "Implantação", "Sistemas") aparecem.
2. Adicione a nova especialidade.
3. Modifique as opções da UI em `App.tsx`:
```tsx
  <select>
    <option value="Sistemas">Sistemas</option>
    <!-- Adicione a sua: -->
    <option value="Redes">Redes</option>
  </select>
```
Após alteração, basta executar a rotina de Build/Re-build dos ambientes explicitados acima (Docker, Cloud, NPM).


## 📂 Dicionário de Arquivos
- `src/lib/supabase.ts`: Inicialização do cliente Supabase.
- `supabase/migrations/`: Scripts SQL para estruturação do banco de dados.
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
### [1.1.0] - 2026-03-05
- Integração com Supabase para persistência de dados em tempo real.
- Refatoração de estado para suporte a operações assíncronas.
- Adição de scripts de migração SQL.

### [1.0.0] - 2026-03-02
- Implementação inicial conforme requisitos APM.
- Adição de infraestrutura Docker.
- Implementação de utilitário de log e testes unitários.
- Melhorias de acessibilidade e segurança (sanitização).
