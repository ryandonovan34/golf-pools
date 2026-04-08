import { NextRequest, NextResponse } from "next/server";
import { fetchRoster } from "@/lib/espn/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const players = await fetchRoster(eventId);
    return NextResponse.json(players);
  } catch (error) {
    console.error("ESPN roster fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ESPN roster" },
      { status: 500 }
    );
  }
}
