import { createHmac, timingSafeEqual } from 'crypto'

const TOKEN_SECRET = process.env.BACKOFFICE_TOKEN_SECRET ?? 'cashou-backoffice-secret'
const TOKEN_TTL_MS = Number(process.env.BACKOFFICE_TOKEN_TTL_MS ?? 1000 * 60 * 60 * 12) // 12h default

const signPayload = (payload: string) => {
  return createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex')
}

const encode = (value: string) => Buffer.from(value).toString('base64')
const decode = (value: string) => Buffer.from(value, 'base64').toString()

export const generateBackofficeToken = (userId: number) => {
  const issuedAt = Date.now()
  const payload = `${userId}:${issuedAt}`
  const signature = signPayload(payload)
  return encode(`${payload}:${signature}`)
}

export interface BackofficeTokenPayload {
  userId: number
  issuedAt: number
}

export const verifyBackofficeToken = (token: string): BackofficeTokenPayload | null => {
  try {
    const decoded = decode(token)
    const [userIdStr, issuedAtStr, signature] = decoded.split(':')
    if (!userIdStr || !issuedAtStr || !signature) {
      return null
    }

    const payload = `${userIdStr}:${issuedAtStr}`
    const expectedSignature = signPayload(payload)

    if (expectedSignature.length !== signature.length) {
      return null
    }

    const expectedBuffer = Buffer.from(expectedSignature)
    const providedBuffer = Buffer.from(signature)

    if (expectedBuffer.length !== providedBuffer.length) {
      return null
    }

    if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
      return null
    }

    const userId = Number(userIdStr)
    const issuedAt = Number(issuedAtStr)

    if (!Number.isFinite(userId) || !Number.isFinite(issuedAt)) {
      return null
    }

    if (issuedAt + TOKEN_TTL_MS < Date.now()) {
      return null
    }

    return { userId, issuedAt }
  } catch {
    return null
  }
}
