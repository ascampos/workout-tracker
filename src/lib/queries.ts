import { getHistoryFn, getSessionHistoryFn } from '@/utils/log-sets'

export const queryKeys = {
  sessionHistory: () => ['sessionHistory'] as const,
  history: (exerciseKey: string) => ['history', exerciseKey] as const,
} as const

export const sessionHistoryQuery = () => ({
  queryKey: queryKeys.sessionHistory(),
  queryFn: () => getSessionHistoryFn(),
})

export const historyQuery = (exerciseKey: string) => ({
  queryKey: queryKeys.history(exerciseKey),
  queryFn: () => getHistoryFn({ data: { exerciseKey } }),
  enabled: !!exerciseKey,
})
