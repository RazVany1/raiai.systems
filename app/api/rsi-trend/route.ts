import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "data", "rsi-trend-dashboard.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  const v2FilePath = path.join(process.cwd(), "public", "data", "rsi-interest-zones-v2.json");
  let v2InterestRows: unknown[] = [];

  if (fs.existsSync(v2FilePath)) {
    try {
      const v2Raw = fs.readFileSync(v2FilePath, "utf-8");
      const v2Data = JSON.parse(v2Raw);
      v2InterestRows = Array.isArray(v2Data?.interestRows) ? v2Data.interestRows : [];
    } catch {
      v2InterestRows = [];
    }
  }

  return NextResponse.json({
    ...data,
    v2InterestRows,
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
