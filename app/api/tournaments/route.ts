import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: tournaments, error } = await supabaseAdmin
      .from("tournaments")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Supabase tournaments error:", error);
      return NextResponse.json(
        { error: "Failed to fetch tournaments", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(tournaments ?? []);
  } catch (error) {
    console.error("Tournaments fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
