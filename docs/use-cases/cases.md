# Use Cases - PlantoGen APM

## UC01: Cadastro de Profissional
- **Ator**: Gestor
- **Fluxo Principal**:
  1. O gestor acessa a aba "Equipe".
  2. Insere nome, matrícula e especialidade.
  3. O sistema valida os campos e adiciona à lista.
- **Tratamento de Erros**:
  - Se campos obrigatórios estiverem vazios, exibe mensagem amigável.

## UC02: Geração de Planilha APM
- **Ator**: Gestor
- **Fluxo Principal**:
  1. O gestor monta a escala (manual ou automática).
  2. Clica em "Gerar Planilha APM".
  3. O sistema processa os dados e gera um arquivo .xlsx com as abas "Area" e "Funcionarios".
- **Pós-condição**: Arquivo baixado com nomenclatura padrão.
