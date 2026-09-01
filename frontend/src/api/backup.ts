import { api } from '../lib/apiClient'

export function triggerBackup() {
  return api.post<{ status: string }>('/backup/trigger')
}
