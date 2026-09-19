// ─────────────────────────────────────────────────────────────
//  카드 그림 — 카톡·슬랙에 링크를 붙였을 때 보이는 1200×630 이미지
//
//  public/og.png 를 만들어 넣는 대신, 이 파일이 매번 그려줍니다.
//  파일 이름이 opengraph-image 라서 Next 가 알아서 <meta og:image> 를 붙입니다.
// ─────────────────────────────────────────────────────────────

import { ImageResponse } from "next/og";

const 사이트이름 = process.env.NEXT_PUBLIC_SITE_NAME ?? "오늘의 한 줄";
const 설명 = "하루에 한 줄씩 남기는 작은 가게";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = 사이트이름;

// 카드 그림의 기본 폰트에는 한글이 없습니다. 안 실으면 네모(□)로 나옵니다.
// ponytail: 구글 폰트에서 받아 씁니다. 실패하면 폰트 없이 그립니다 — 빌드는 멈추지 않습니다.
async function 한글폰트(글자: string) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(글자)}`,
    ).then((r) => r.text());
    const 주소 = css.match(/src: url\((.+?)\)/)?.[1];
    if (!주소) return null;
    return await fetch(주소).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const 폰트 = await 한글폰트(사이트이름 + 설명);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#14161a",
          color: "#e8eaed",
          padding: "80px",
        }}
      >
        <div style={{ width: 88, height: 8, background: "#f5b544", marginBottom: 48 }} />
        <div style={{ fontSize: 88, color: "#f5b544", lineHeight: 1.2 }}>{사이트이름}</div>
        <div style={{ fontSize: 40, color: "#8b93a1", marginTop: 24 }}>{설명}</div>
      </div>
    ),
    {
      ...size,
      fonts: 폰트
        ? [{ name: "Noto Sans KR", data: 폰트, weight: 700 as const, style: "normal" as const }]
        : [],
    },
  );
}
