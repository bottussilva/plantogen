export interface Professional {
  id: string;
  name: string;
  matricula: string;
  specialty: string;
  color: string;
}

export interface AreaData {
  unidade: string;
  sigla: string;
  gerencia: string;
  area: string;
  descricao: string;
  pcn: string;
  horasSobreaviso: string;
}

export interface Shift {
  id: string;
  date: Date;
  professionalId: string | null;
  type: 'diurno' | 'noturno';
}

export interface MonthSchedule {
  month: number;
  year: number;
  shifts: Shift[];
}
