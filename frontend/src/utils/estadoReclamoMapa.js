export const ESTADOS_RECLAMO_MAPA = [
  {
    valor: "NUEVO",
    texto: "Nuevo",
  },
  {
    valor: "ASIGNADO_GUARDIA",
    texto:
      "Asignado a guardia",
  },
  {
    valor: "ASIGNADO_INSPECTOR",
    texto:
      "Asignado a inspector",
  },
  {
    valor: "EN_INSPECCION",
    texto:
      "En inspección",
  },
  {
    valor: "EN_SEGUIMIENTO",
    texto:
      "En seguimiento",
  },
  {
    valor:
      "PENDIENTE_ACTUACION",
    texto:
      "Pendiente actuación",
  },
  {
    valor: "RESUELTO",
    texto: "Resuelto",
  },
  {
    valor: "ANULADO",
    texto: "Anulado",
  },
];

const colores = {
  NUEVO: "#dc2626",

  ASIGNADO_GUARDIA:
    "#f97316",

  ASIGNADO_INSPECTOR:
    "#f59e0b",

  EN_INSPECCION:
    "#2563eb",

  EN_SEGUIMIENTO:
    "#7c3aed",

  PENDIENTE_ACTUACION:
    "#db2777",

  RESUELTO:
    "#16a34a",

  ANULADO:
    "#6b7280",
};

export const obtenerColorEstado = (
  estado
) => {
  return (
    colores[estado] ||
    "#374151"
  );
};

export const obtenerNombreEstado = (
  estado
) => {
  const encontrado =
    ESTADOS_RECLAMO_MAPA.find(
      (item) =>
        item.valor === estado
    );

  return (
    encontrado?.texto ||
    estado ||
    "Sin estado"
  );
};