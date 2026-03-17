export const containerTypes = ['FT20', 'FT40'] as const;
export const containerStatuses = [
  'AGUARDANDO_NAVIO',
  'NO_PORTO',
  'EM_FISCALIZACAO',
  'LIBERADO',
  'EM_TRANSPORTE',
  'ENTREGUE',
  'ATRASADO',
] as const;
export const shipStatuses = [
  'PREVISTO',
  'ATRACADO',
  'DESCARREGANDO',
  'PARTIU',
  'ATRASADO',
] as const;
export const carrierStatuses = [
  'DISPONIVEL',
  'EM_OPERACAO',
  'INATIVA',
] as const;
export const eventTypes = [
  'NAVIO_PREVISTO',
  'NAVIO_CHEGOU',
  'CONTAINER_DESCARREGADO',
  'EM_FISCALIZACAO',
  'LIBERADO',
  'SAIU_PARA_TRANSPORTE',
  'ENTREGUE',
  'STATUS_ATUALIZADO',
] as const;

export type ContainerTypeValue = (typeof containerTypes)[number];
export type ContainerStatusValue = (typeof containerStatuses)[number];
export type ShipStatusValue = (typeof shipStatuses)[number];
export type CarrierStatusValue = (typeof carrierStatuses)[number];
export type EventTypeValue = (typeof eventTypes)[number];
