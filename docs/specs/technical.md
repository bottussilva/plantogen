# Especificações Técnicas

## Arquitetura
- **Frontend**: React 19 + Vite + Tailwind CSS.
- **Backend**: Supabase (PostgreSQL + PostgREST).
- **Estado**: React Hooks (useState, useMemo, useEffect) sincronizados com o banco através do cliente Supabase.
- **Animações**: Motion (framer-motion).
- **Exportação**: XLSX (planilhas) e jsPDF (certificados).
- **Áudio**: Howler.js para feedback sonoro.

## Modelo de Dados (Supabase)
- **professionals**: { id: uuid, name: text, matricula: text, specialty: text, color: text }
- **shifts**: { id: bigint, date: date (ISO string YYYY-MM-DD), professionalId: uuid, type: text }
- **area_data**: { id: integer (PK), unidade, sigla, gerencia, area, descricao, pcn, horas_sobreaviso }
