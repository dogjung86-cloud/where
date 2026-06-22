import { NextRequest, NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const adminUser = await getAdminUser(request);

  return NextResponse.json({
    isAdmin: Boolean(adminUser),
    walletAddress: adminUser?.walletAddress ?? null,
  });
}
