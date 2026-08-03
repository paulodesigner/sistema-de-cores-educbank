/**
 * Dado de exemplo para a tela do funil de matrículas.
 * A FORMA vem do próprio repositório: `FunnelStage`/`FunnelCard`
 * (`types/enrollment-funnel-types.ts`) e a configuração de coluna vem de
 * `utils/enrollment-funnel-columns.ts` — nenhuma etapa é inventada aqui.
 * Os nomes são fictícios; a estrutura é a real.
 */
import { COLUMN_CONFIG_BY_STAGE } from '@ebp/modules/student-area/utils/enrollment-funnel-columns'
import type { FunnelCard, FunnelStage, FunnelStageId } from '@ebp/modules/student-area/types/enrollment-funnel-types'

const ORDEM: FunnelStageId[] = [
  'interested',
  'registrationPending',
  'readyToIssue',
  'paymentPending',
  'completed',
  'lost',
]

export const ETAPAS_EXEMPLO: FunnelStage[] = ORDEM.map((id, i) => ({
  id,
  order: i + 1,
  validators: [],
  ...COLUMN_CONFIG_BY_STAGE[id],
}))

function card(
  id: string,
  studentName: string,
  grade: string,
  stageId: FunnelStageId,
  extra: Partial<FunnelCard> = {}
): FunnelCard {
  return {
    id,
    studentName,
    grade,
    stageId,
    enrollmentType: 'new',
    schoolCode: '001',
    financialResponsible: 'Responsável ' + studentName.split(' ')[0],
    financialResponsiblePhone: '11999990000',
    address: null,
    registrationCompleted: false,
    invoiceStatus: 'NotIssued',
    contractStatus: 'NotIssued',
    daysWithoutReturn: 0,
    ...extra,
  }
}

export const CARDS_EXEMPLO: FunnelCard[] = [
  card('1', 'Ana Souza', '1º ano', 'interested', { daysWithoutReturn: 2 }),
  card('2', 'Bruno Lima', '2º ano', 'interested', { daysWithoutReturn: 6 }),
  card('3', 'Carla Dias', '3º ano', 'registrationPending', { enrollmentType: 'reenrollment' }),
  card('4', 'Diego Rocha', '5º ano', 'registrationPending', { daysWithoutReturn: 11 }),
  card('5', 'Elisa Prado', '6º ano', 'readyToIssue', { registrationCompleted: true }),
  card('6', 'Felipe Nunes', '7º ano', 'paymentPending', {
    registrationCompleted: true,
    invoiceStatus: 'Issued',
    contractStatus: 'Issued',
  }),
  card('7', 'Gabriela Melo', '8º ano', 'completed', {
    registrationCompleted: true,
    invoiceStatus: 'Paid',
    contractStatus: 'Signed',
    enrollmentType: 'reenrollment',
  }),
  card('8', 'Heitor Alves', '9º ano', 'lost', { daysWithoutReturn: 30 }),
]

export const TOTAIS_EXEMPLO: Partial<Record<FunnelStageId, number>> = ORDEM.reduce(
  (acc, id) => ({ ...acc, [id]: CARDS_EXEMPLO.filter((c) => c.stageId === id).length }),
  {}
)
