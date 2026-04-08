import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode, displayName } = body;

    if (!inviteCode || !displayName) {
      return NextResponse.json(
        { error: "Missing required fields: inviteCode, displayName" },
        { status: 400 }
      );
    }

    // Look up pool by invite code
    const { data: pool, error: poolError } = await supabaseAdmin
      .from("pools")
      .select("id, name, is_locked")
      .eq("invite_code", inviteCode.toUpperCase())
      .single();

    if (poolError || !pool) {
      return NextResponse.json(
        { error: "Invalid invite code. Please check and try again." },
        { status: 404 }
      );
    }

    if (pool.is_locked) {
      return NextResponse.json(
        { error: "This pool is locked. Picks can no longer be submitted." },
        { status: 403 }
      );
    }

    // Check if display name is already taken in this pool
    const { data: existing } = await supabaseAdmin
      .from("pool_members")
      .select("id")
      .eq("pool_id", pool.id)
      .eq("display_name", displayName)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "That display name is already taken in this pool. Please choose another." },
        { status: 409 }
      );
    }

    // Generate participant token and create member
    const participantToken = crypto.randomUUID();

    const { error: memberError } = await supabaseAdmin
      .from("pool_members")
      .insert({
        pool_id: pool.id,
        display_name: displayName,
        participant_token: participantToken,
      });

    if (memberError) {
      console.error("Join pool error:", memberError);
      return NextResponse.json(
        { error: "Failed to join pool" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      poolId: pool.id,
      poolName: pool.name,
      participantToken,
    });
  } catch (error) {
    console.error("Join pool error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
