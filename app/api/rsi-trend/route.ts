import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "data", "rsi-trend-dashboard.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  const v0FilePath = path.join(process.cwd(), "public", "data", "rsi-interest-zones-v0.json");
  let v0InterestRows: unknown[] = [];

  if (fs.existsSync(v0FilePath)) {
    try {
      const v0Raw = fs.readFileSync(v0FilePath, "utf-8");
      const v0Data = JSON.parse(v0Raw);
      v0InterestRows = Array.isArray(v0Data?.interestRows) ? v0Data.interestRows : [];
    } catch {
      v0InterestRows = [];
    }
  }

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
    v0InterestRows,
    v2InterestRows,
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
