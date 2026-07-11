export interface FiltroPeriodo {
  dataInicio: string;
  dataFim: string;
}

export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfMonth(date: Date): string {
  return formatDateLocal(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(date: Date): string {
  return formatDateLocal(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function periodoPadrao(): FiltroPeriodo {
  const hoje = new Date();
  return {
    dataInicio: startOfMonth(hoje),
    dataFim: formatDateLocal(hoje),
  };
}

export function parseFiltroPeriodo(
  params: { de?: string; ate?: string } | undefined
): FiltroPeriodo {
  const padrao = periodoPadrao();
  const dataInicio = params?.de && isValidDate(params.de) ? params.de : padrao.dataInicio;
  const dataFim = params?.ate && isValidDate(params.ate) ? params.ate : padrao.dataFim;

  if (dataInicio > dataFim) {
    return { dataInicio: dataFim, dataFim: dataInicio };
  }

  return { dataInicio, dataFim };
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatPeriodoLabel(dataInicio: string, dataFim: string): string {
  const [yi, mi, di] = dataInicio.split("-").map(Number);
  const [yf, mf, df] = dataFim.split("-").map(Number);

  if (dataInicio === startOfMonth(new Date(yi, mi - 1, di)) && dataFim === endOfMonth(new Date(yf, mf - 1, df))) {
    if (yi === yf && mi === mf) {
      return `${MESES[mi - 1]} ${yi}`;
    }
  }

  const fmt = (y: number, m: number, d: number) =>
    `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;

  return `${fmt(yi, mi, di)} — ${fmt(yf, mf, df)}`;
}

export function formatDia(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

export const PRESETS_PERIODO = [
  {
    id: "mes-atual",
    label: "Este mês",
    getValue: (): FiltroPeriodo => {
      const hoje = new Date();
      return { dataInicio: startOfMonth(hoje), dataFim: formatDateLocal(hoje) };
    },
  },
  {
    id: "7-dias",
    label: "Últimos 7 dias",
    getValue: (): FiltroPeriodo => {
      const hoje = new Date();
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 6);
      return { dataInicio: formatDateLocal(inicio), dataFim: formatDateLocal(hoje) };
    },
  },
  {
    id: "30-dias",
    label: "Últimos 30 dias",
    getValue: (): FiltroPeriodo => {
      const hoje = new Date();
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 29);
      return { dataInicio: formatDateLocal(inicio), dataFim: formatDateLocal(hoje) };
    },
  },
  {
    id: "mes-anterior",
    label: "Mês anterior",
    getValue: (): FiltroPeriodo => {
      const hoje = new Date();
      const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      return {
        dataInicio: startOfMonth(anterior),
        dataFim: endOfMonth(anterior),
      };
    },
  },
] as const;
