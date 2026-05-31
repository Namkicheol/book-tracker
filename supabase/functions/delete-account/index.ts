// 회원 탈퇴(계정 삭제) Edge Function
//
// 호출자의 JWT를 검증해 본인 계정만 삭제한다. service_role로 auth.users 행을
// 삭제하면, public.users / public.books / public.folders 등이 모두
// `references auth.users(id) on delete cascade` 로 연결돼 있어 함께 정리된다.
//
// 배포(외부 단계 — 사용자가 직접):
//   supabase functions deploy delete-account
//   (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY 는
//    Edge Functions 런타임에 자동 주입됨)
//
// 클라이언트: SB.client.functions.invoke('delete-account')

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1) 요청자 본인 확인 (전달된 JWT로 getUser)
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Invalid or expired token' }, 401)

    // 2) service_role로 본인 계정만 삭제 → FK on delete cascade가 데이터 정리
    const admin = createClient(url, serviceKey)
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
    if (delErr) return json({ error: delErr.message }, 500)

    return json({ ok: true, deletedUserId: user.id })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
