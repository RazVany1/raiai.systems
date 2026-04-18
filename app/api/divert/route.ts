import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function readJson(fileName: string) {
  const filePath = path.join(process.cwd(), "public", "data", fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export async function GET() {
  const live = readJson("divert-live.json");
  const history = readJson("divert-history.json");
  const postExit = readJson("divert-post-exit.json");
  const tradeLog = readJson("divert-trade-log.json");
  return NextResponse.json({
    ...live,
    history,
    postExit,
    tradeLog,
  });
}
