-- Tabela de Profissionais
CREATE TABLE professionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  matricula TEXT UNIQUE NOT NULL,
  specialty TEXT,
  color TEXT
);

-- Tabela de Escalas (Shifts)
CREATE TABLE shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT CHECK (type IN ('diurno', 'noturno')) NOT NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE
);

-- Tabela de Configurações da Área
CREATE TABLE area_data (
  id SERIAL PRIMARY KEY,
  unidade TEXT,
  sigla TEXT,
  gerencia TEXT,
  area TEXT,
  descricao TEXT,
  pcn TEXT,
  horas_sobreaviso TEXT
);

-- Inserindo dados iniciais da Área
INSERT INTO area_data (unidade, sigla, gerencia, area, descricao, pcn, horas_sobreaviso) 
VALUES ('UAC', 'GSPA', 'GSPA', 'Arquitetura TI Robotizacao Processos', 'Descrição Sobreaviso', 'Nome do PCN', '15:45');
