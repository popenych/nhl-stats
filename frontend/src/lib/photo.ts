import { ApiError, tryRefresh } from './apiClient'

export function photoUrl(photoPath: string) {
  return `/api/photos/${photoPath}`
}

export async function postPhoto<T>(path: string, file: File, isRetry = false): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (res.status === 401 && !isRetry) {
    if (await tryRefresh()) return postPhoto<T>(path, file, true)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.detail ?? res.statusText)
  }
  return res.json()
}
