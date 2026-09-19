"use client";

/* ─────────────────────────────────────────────────────────
   ④회차 1교시 — 창고 연결 확인 (로그인 없음)

   1. week5-done 브랜치에서 app/db-test/ 폴더를 만들고
   2. 이 파일을 page.tsx 로 저장한 뒤
   3. http://localhost:3000/db-test 로 들어갑니다.

   ★ 자물쇠(RLS)를 채우기 전에 먼저 해야 합니다.
   ───────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function 창고연결확인() {
  const [줄들, set줄들] = useState<any[]>([]);
  const [알림, set알림] = useState("창고에 물어보는 중…");

  useEffect(() => {
    supabase
      .from("lines")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          set알림("✗  창고가 대답하지 않습니다 — " + error.message);
          return;
        }
        set줄들(data ?? []);
        set알림(`✓  창고와 연결됐습니다 — ${data?.length ?? 0}줄을 받아왔습니다`);
      });
  }, []);

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "56px 24px",
                   fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
      <p style={{ fontSize: 13, letterSpacing: 1.5, color: "#FF385C",
                  fontWeight: 700, margin: 0 }}>
        창고 연결 확인
      </p>
      <h1 style={{ fontSize: 34, margin: "8px 0 4px" }}>로그인 없이 그냥 보입니다</h1>
      <p style={{ color: "#6A6A6A", margin: "0 0 28px" }}>
        지금은 자물쇠가 없어서, 누가 쓴 줄이든 전부 나옵니다.
      </p>

      <p style={{ background: "#6A6A6A", borderLeft: "4px solid #FF385C",
                  padding: "14px 18px", borderRadius: 6, fontWeight: 600 }}>
        {알림}
      </p>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 24 }}>
        {줄들.map((l) => (
          <li key={l.id}
              style={{ border: "1px solid #DDD", borderRadius: 8,
                       padding: "14px 18px", marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: "#92174D", fontWeight: 600 }}>
              {l.nickname}
              {!l.user_id && (
                <span style={{ color: "#929292", fontWeight: 400 }}>
                  {"   · 주인 없음"}
                </span>
              )}
            </div>
            <div style={{ fontSize: 17 }}>{l.message}</div>
          </li>
        ))}
      </ul>

      {줄들.length === 0 && (
        <p style={{ color: "#929292" }}>
          0줄입니다. 자물쇠를 이미 채우셨다면 이게 정상입니다.
        </p>
      )}
    </main>
  );
}
