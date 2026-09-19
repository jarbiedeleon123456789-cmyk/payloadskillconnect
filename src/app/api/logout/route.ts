export async function POST() {
  return Response.json(
    { success: true },
    {
      headers: {
        'Set-Cookie': 'payload-token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
      },
    },
  )
}
