import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;

    // Get pool with tournament and tiers
    const { data: pool, error } = await supabaseAdmin
      .from("pools")
      .select(`
        *,
        tournaments(*),
        tiers(*, tier_players(*))
      `)
      .eq("id", poolId)
      .single();

    if (error || !pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    // Check if user is a member (via participant token query param)
    const token = new URL(request.url).searchParams.get("token");
    let member = null;
    let picks = null;

    if (token) {
      const { data: m } = await supabaseAdmin
        .from("pool_members")
        .select("*, picks(*)")
        .eq("pool_id", poolId)
        .eq("participant_token", token)
        .single();

      if (m) {
        member = {
          id: m.id,
          displayName: m.display_name,
          participantToken: m.participant_token,
        };
        picks = m.picks;
      }
    }

    // Format tiers
    const tiers = (pool.tiers ?? [])
      .sort((a: { tier_number: number }, b: { tier_number: number }) => a.tier_number - b.tier_number)
      .map((t: { id: string; pool_id: string; tier_number: number; label: string | null; tier_players: unknown[] }) => ({
        id: t.id,
        pool_id: t.pool_id,
        tier_number: t.tier_number,
        label: t.label,
        players: t.tier_players ?? [],
      }));

    // Auto-lock: pool is effectively locked if manually locked OR first tee time has passed
    const tournament = pool.tournaments;
    const now = new Date();
    const tournamentStarted = tournament?.start_date
      ? new Date(tournament.start_date).getTime() <= now.getTime()
      : false;
    const effectivelyLocked = pool.is_locked || tournamentStarted;

    // If tournament has started and pool isn't manually locked yet, lock it in DB
    if (tournamentStarted && !pool.is_locked) {
      await supabaseAdmin
        .from("pools")
        .update({ is_locked: true })
        .eq("id", poolId);
    }

    return NextResponse.json({
      pool: {
        id: pool.id,
        name: pool.name,
        inviteCode: pool.invite_code,
        isLocked: effectivelyLocked,
        creatorName: pool.creator_name,
        createdAt: pool.created_at,
      },
      tournament,
      tiers,
      member,
      picks,
    });
  } catch (error) {
    console.error("Get pool error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH to lock the pool (requires admin code)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const body = await request.json();
    const { adminCode, isLocked } = body;

    if (!adminCode) {
      return NextResponse.json(
        { error: "Admin code is required" },
        { status: 400 }
      );
    }

    // Verify admin code
    const { data: pool } = await supabaseAdmin
      .from("pools")
      .select("id, admin_code")
      .eq("id", poolId)
      .single();

    if (!pool || pool.admin_code !== adminCode) {
      return NextResponse.json(
        { error: "Invalid admin code" },
        { status: 403 }
      );
    }

    await supabaseAdmin
      .from("pools")
      .update({ is_locked: isLocked ?? true })
      .eq("id", poolId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update pool error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
