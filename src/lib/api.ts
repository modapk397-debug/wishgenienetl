/**
 * Wish Genie API client + shared types.
 * All requests go through `request()` which attaches the admin session token
 * (stored in localStorage) and normalizes error messages.
 */

export type Occasion = 'birthday' | 'anniversary' | 'congratulations' | 'thank-you' | 'wedding' | 'new-baby' | 'good-luck' | 'just-because' | 'other'
export type AnimationTheme = 'confetti' | 'hearts' | 'balloons' | 'fireworks' | 'particles'
export type ColorTheme = 'rose' | 'ocean' | 'sunset' | 'royal' | 'mint' | 'midnight'
export type WishStatus = 'pending' | 'approved' | 'rejected'

export interface Page {
  id: number
  title: string
  occasion: Occasion
  recipient: string
  letter: string
  animation: AnimationTheme
  colorTheme: ColorTheme
  music: string | null
  autoPublish: boolean
  viewToken: string
  contributeToken: string
  views: number
  createdAt: string
  updatedAt: string
  wishCount?: number
}

export interface Photo {
  id: number
  page_id: number
  filename: string
  position: number
}

export interface Wish {
  id: number
  pageId: number
  name: string
  message: string
  photo: string | null
  status: WishStatus
  createdAt: string
}

export interface PublicPage {
  id: number
  title: string
  occasion: Occasion
  recipient: string
  letter: string
  animation: AnimationTheme
  colorTheme: ColorTheme
  music: string | null
  views: number
}

const TOKEN_KEY = 'wish-genie-admin-token'

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getAdminToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(path, { ...options, headers })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    if (res.status === 401 && token) setAdminToken(null)
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`)
  }
  return data as T
}

/* ------------------------------- auth -------------------------------- */

export const auth = {
  login: (passcode: string) => request<{ token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ passcode }) }),
  me: () => request<{ admin: boolean }>('/api/auth/me'),
}

/* ------------------------------- admin ------------------------------- */

export const admin = {
  listPages: () => request<{ pages: Page[] }>('/api/admin/pages'),
  getPage: (id: number) => request<{ page: Page; photos: Photo[]; wishes: Wish[] }>(`/api/admin/pages/${id}`),
  createPage: (input: Partial<Page>) => request<{ page: Page }>('/api/admin/pages', { method: 'POST', body: JSON.stringify(input) }),
  updatePage: (id: number, input: Partial<Page>) => request<{ page: Page }>(`/api/admin/pages/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deletePage: (id: number) => request<{ ok: boolean }>(`/api/admin/pages/${id}`, { method: 'DELETE' }),
  rotateTokens: (id: number) => request<{ page: Page }>(`/api/admin/pages/${id}/tokens`, { method: 'PUT' }),
  uploadPhotos: (id: number, files: File[]) => {
    const body = new FormData()
    files.forEach((file) => body.append('photos', file))
    return request<{ photos: Photo[]; rejected: string[] }>(`/api/admin/pages/${id}/photos`, { method: 'POST', body })
  },
  reorderPhotos: (id: number, order: number[]) =>
    request<{ photos: Photo[] }>(`/api/admin/pages/${id}/photos`, { method: 'PUT', body: JSON.stringify({ order }) }),
  deletePhoto: (id: number, photoId: number) => request<{ photos: Photo[] }>(`/api/admin/pages/${id}/photos/${photoId}`, { method: 'DELETE' }),
  setWishStatus: (wishId: number, status: WishStatus) => request<{ wish: Wish }>(`/api/admin/wishes/${wishId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteWish: (wishId: number) => request<{ ok: boolean }>(`/api/admin/wishes/${wishId}`, { method: 'DELETE' }),
}

/* ------------------------------- public ------------------------------ */

export const publicApi = {
  getViewPage: (token: string) => request<{ page: PublicPage; photos: Photo[]; wishes: Wish[] }>(`/api/p/${token}`),
  getContributeInfo: (token: string) =>
    request<{
      page: Pick<PublicPage, 'title' | 'occasion' | 'recipient' | 'animation' | 'colorTheme'> & { autoPublish: boolean; wishCount: number }
    }>(`/api/c/${token}`),
  submitWish: (token: string, form: FormData) =>
    request<{ pending: boolean; message: string }>(`/api/c/${token}/wishes`, { method: 'POST', body: form }),
}

export function photoUrl(filename: string) {
  return `/uploads/${filename}`
}
