export interface ApiKey {
  id: string
  name: string
  provider: string
  lastUsedAt?: Date | null
  createdAt: Date
}

export interface ApiKeyForm {
  id: string
  name: string
  provider: string
  lastUsedAt?: string
  createdAt: string
}