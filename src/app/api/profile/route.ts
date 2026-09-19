import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'

const allowedFields = ['phone', 'barangay', 'bio', 'availability', 'facebookUrl'] as const

export async function PATCH(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })

  if (!user) {
    return Response.json({ message: 'You must be logged in.' }, { status: 401 })
  }

  const body = await request.json()
  const data = Object.fromEntries(
    allowedFields
      .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
      .map((field) => [field, body[field]]),
  )

  const updated = await payload.update({
    collection: 'users',
    id: user.id,
    data,
    overrideAccess: true,
  })

  return Response.json(updated)
}
