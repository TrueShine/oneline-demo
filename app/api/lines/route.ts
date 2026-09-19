// ─────────────────────────────────────────────────────────────
//  웨이터 (④회차)
//
//  ③회차까지는 손님(브라우저)이 창고에 직접 들어갔습니다.
//  이제 손님은 이 웨이터에게 주문서만 건네고, 창고는 웨이터가 다녀옵니다.
//
//  주소도 폴더 위치 그대로입니다.
//      app/api/lines/route.ts   →   /api/lines
//
//  이 파일은 서버에서만 실행됩니다. 브라우저 개발자도구로 열어봐도 안 보입니다.
// ─────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { LineRow } from "@/lib/store";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 손님이 내민 팔찌(토큰)를 그대로 들고 창고에 갑니다.
// 이렇게 해야 창고의 RLS 가 "이 사람 것"만 골라 내줍니다.
function 창고열기(팔찌: string) {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${팔찌}` } },
    auth: { persistSession: false },
  });
}

function 팔찌확인(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}

// 팔찌를 받아서 "진짜 유효한지" 창고 입구에서 한 번 확인합니다.
//
//  전에는 이 확인 없이 바로 주문을 넣었습니다.
//  그러면 팔찌가 낡았을 때(만료·다른 가게 팔찌) 창고가 거절하고,
//  그 거절이 전부 500(주방 화재)으로 손님에게 나갔습니다.
//  팔찌 문제는 손님 쪽 사정이므로 401 로 돌려보내는 것이 맞습니다.
async function 입구통과(
  req: Request
): Promise<
  | { ok: true; supabase: SupabaseClient; user: { id: string } }
  | { ok: false; res: NextResponse }
> {
  const 팔찌 = 팔찌확인(req);
  if (!팔찌) {
    // 401 — 회원만 이용 가능합니다 (로그인을 안 했습니다)
    return {
      ok: false,
      res: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }

  const supabase = 창고열기(팔찌);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    // 401 — 팔찌가 낡았습니다. 다시 로그인하면 풀립니다.
    return {
      ok: false,
      res: NextResponse.json(
        { error: "팔찌가 만료됐습니다. 다시 로그인해주세요." },
        { status: 401 }
      ),
    };
  }

  return { ok: true, supabase, user: data.user };
}

// ── GET · 보여주세요 ──────────────────────────────────────────
export async function GET(req: Request) {
  const 입구 = await 입구통과(req);
  if (!입구.ok) return 입구.res;

  const { data, error } = await 입구.supabase
    .from("lines")
    .select("id, nickname, message, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    // 여기까지 왔는데 실패하면 진짜 가게 잘못입니다.
    // 500 — 주방에 불났습니다 (터미널 로그를 봐야 합니다)
    console.error("[GET /api/lines]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lines: (data ?? []) as LineRow[] });
}

// ── POST · 새로 적어주세요 ────────────────────────────────────
export async function POST(req: Request) {
  const 입구 = await 입구통과(req);
  if (!입구.ok) return 입구.res;

  // 주문서가 JSON 이 아닐 수도 있습니다. 그때도 500 이 아니라 400 입니다.
  let 주문서: { nickname?: string; message?: string };
  try {
    주문서 = await req.json();
  } catch {
    return NextResponse.json({ error: "주문서를 읽을 수 없습니다." }, { status: 400 });
  }

  const { nickname, message } = 주문서;

  // 판단 — 빈 칸이면 그냥 돌려보냅니다 (②회차의 그 뼈대)
  if (!message || message.trim().length === 0) {
    // 400 — 주문서가 비었습니다
    return NextResponse.json({ error: "한 줄을 입력해주세요." }, { status: 400 });
  }

  // 누가 쓴 글인지는 손님이 아니라 웨이터가 채웁니다.
  // 손님이 user_id 를 직접 보내게 두면 남의 이름으로 쓸 수 있습니다.
  const { data, error } = await 입구.supabase
    .from("lines")
    .insert({
      user_id: 입구.user.id,
      nickname: (nickname ?? "").trim() || "익명",
      message: message.trim(),
    })
    .select("id, nickname, message, created_at")
    .single();

  if (error) {
    console.error("[POST /api/lines]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 201 — 새로 만들어졌습니다
  return NextResponse.json({ line: data as LineRow }, { status: 201 });
}

// ── DELETE · 지워주세요 ───────────────────────────────────────
export async function DELETE(req: Request) {
  const 입구 = await 입구통과(req);
  if (!입구.ok) return 입구.res;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "어느 줄을 지울지 알려주세요." }, { status: 400 });
  }

  // where 를 반드시 붙입니다. 빼면 장부 전체가 날아갑니다. (③회차 경고)
  // 남의 줄을 지우려 해도 RLS 가 막아서 0건 삭제로 끝납니다.
  const { error } = await 입구.supabase.from("lines").delete().eq("id", id);

  if (error) {
    console.error("[DELETE /api/lines]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
