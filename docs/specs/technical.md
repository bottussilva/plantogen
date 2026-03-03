# Especificações Técnicas

## Arquitetura
- **Frontend**: React 19 + Vite + Tailwind CSS.
- **Estado**: React Hooks (useState, useMemo, useEffect).
- **Animações**: Motion (framer-motion).
- **Exportação**: XLSX (planilhas) e jsPDF (certificados).
- **Áudio**: Howler.js para feedback sonoro.

## Modelo de Dados
- **Professional**: { id, name, matricula, specialty, color }
- **Shift**: { id, date, professionalId, type }
- **AreaData**: { unidade, sigla, gerencia, area, descricao, pcn, horasSobreaviso }
