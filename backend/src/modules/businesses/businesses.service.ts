import { createId } from '@paralleldrive/cuid2';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import {
    businessCampaigns,
    businessFollowers,
    businessMembers,
    businessWorkspaces,
    campaignDeliveries,
    campaignReactions,
} from '../../db/schema/businesses.js';
import { users } from '../../db/schema/users.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type {
    CampaignReactionsResponse,
    CampaignResponse,
    CreateCampaignInput,
    FollowStatusResponse,
    MetricsResponse,
    StudioOverviewResponse,
    SubmitReactionInput,
    UpdateCampaignInput,
    WorkspaceResponse,
} from './businesses.schemas.js';

// ─── Transformers ─────────────────────────────────────────────────────────────

function toWorkspaceResponse(w: typeof businessWorkspaces.$inferSelect, isFollowedByViewer?: boolean): WorkspaceResponse {
  return {
    id: w.id,
    handle: w.handle,
    displayName: w.displayName,
    avatarUrl: w.avatarUrl ?? null,
    bio: w.bio ?? null,
    isVerified: w.isVerified,
    isActive: w.isActive,
    followerCount: w.followerCount,
    followingCount: w.followingCount,
    ...(isFollowedByViewer !== undefined && { isFollowedByViewer }),
  };
}

function toCampaignResponse(c: typeof businessCampaigns.$inferSelect): CampaignResponse {
  return {
    id: c.id,
    workspaceId: c.workspaceId,
    title: c.title,
    mediaUrl: c.mediaUrl,
    textOverlay: c.textOverlay ?? null,
    isReplayable: c.isReplayable,
    state: c.state,
    createdAt: c.createdAt.toISOString(),
    publishedAt: c.publishedAt?.toISOString() ?? null,
    closedAt: c.closedAt?.toISOString() ?? null,
  };
}

// ─── Owner guard ──────────────────────────────────────────────────────────────

async function requireOwner(workspaceId: string, userId: string) {
  const member = await db.query.businessMembers.findFirst({
    where: and(
      eq(businessMembers.workspaceId, workspaceId),
      eq(businessMembers.userId, userId),
      eq(businessMembers.isActive, true),
    ),
  });
  if (!member) throw new ForbiddenError('Not a workspace owner');
  return member;
}

// ─── Workspace queries ────────────────────────────────────────────────────────

/** GET /businesses/mine — returns active workspaces for the authenticated owner.
 *
 * Two strategies in order:
 * 1. Explicit membership rows in business_members (admin-provisioned, R2.2)
 * 2. Auto-derived: if the user's account_type is 'business' and they have a
 *    matching workspace by handle (username), return it directly. This covers
 *    the development workflow where workspaces are seeded without a formal
 *    membership row.
 */
export async function getMyWorkspaces(userId: string): Promise<WorkspaceResponse[]> {
  // Strategy 1: explicit membership
  const memberships = await db.query.businessMembers.findMany({
    where: and(eq(businessMembers.userId, userId), eq(businessMembers.isActive, true)),
    with: { workspace: true },
  });
  if (memberships.length > 0) {
    return memberships.map((m) => toWorkspaceResponse(m.workspace));
  }

  // Strategy 2: auto-derive from user record (dev / seed convenience)
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || user.accountType !== 'business') return [];

  // Find workspace matching the user's username as handle
  const workspace = await db.query.businessWorkspaces.findFirst({
    where: and(
      eq(businessWorkspaces.handle, user.username),
      eq(businessWorkspaces.isActive, true),
    ),
  });
  if (!workspace) return [];

  // Auto-create the missing membership so future calls use strategy 1
  await db
    .insert(businessMembers)
    .values({ id: createId(), workspaceId: workspace.id, userId, role: 'owner', isActive: true })
    .onConflictDoNothing();

  return [toWorkspaceResponse(workspace)];
}

/** GET /businesses/:handle — consumer-safe public profile */
export async function getWorkspaceByHandle(handle: string, viewerUserId?: string): Promise<WorkspaceResponse> {
  const workspace = await db.query.businessWorkspaces.findFirst({
    where: eq(businessWorkspaces.handle, handle.toLowerCase()),
  });
  if (!workspace) throw new NotFoundError('Business workspace');

  let isFollowedByViewer: boolean | undefined;
  if (viewerUserId) {
    const follow = await db.query.businessFollowers.findFirst({
      where: and(
        eq(businessFollowers.workspaceId, workspace.id),
        eq(businessFollowers.userId, viewerUserId),
      ),
    });
    isFollowedByViewer = !!follow;
  }

  return toWorkspaceResponse(workspace, isFollowedByViewer);
}

/** GET /businesses/:id/overview — studio overview */
export async function getStudioOverview(
  workspaceId: string,
  userId: string,
): Promise<StudioOverviewResponse> {
  await requireOwner(workspaceId, userId);

  const workspace = await db.query.businessWorkspaces.findFirst({
    where: eq(businessWorkspaces.id, workspaceId),
  });
  if (!workspace) throw new NotFoundError('Business workspace');

  // Latest / active campaign
  const campaigns = await db.query.businessCampaigns.findMany({
    where: eq(businessCampaigns.workspaceId, workspaceId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 1,
  });
  const latestCampaign = campaigns[0] ?? null;

  // Aggregate delivery counts for latest campaign
  let deliveryCounts = null;
  if (latestCampaign) {
    const counts = await db
      .select({
        status: campaignDeliveries.status,
        total: count(),
      })
      .from(campaignDeliveries)
      .where(eq(campaignDeliveries.campaignId, latestCampaign.id))
      .groupBy(campaignDeliveries.status);

    const map: Record<string, number> = {};
    for (const row of counts) map[row.status] = Number(row.total);

    deliveryCounts = {
      queued: map.queued ?? 0,
      delivered: map.delivered ?? 0,
      failed: map.failed ?? 0,
      opened: map.opened ?? 0,
      viewed: map.viewed ?? 0,
    };
  }

  return {
    workspace: toWorkspaceResponse(workspace),
    latestCampaign: latestCampaign ? toCampaignResponse(latestCampaign) : null,
    deliveryCounts,
  };
}

// ─── Follow / unfollow ────────────────────────────────────────────────────────

/** POST /businesses/:id/follow — idempotent opt-in. Any authenticated user may follow. */
export async function followWorkspace(workspaceId: string, userId: string): Promise<void> {
  const followerUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!followerUser) throw new NotFoundError('User');

  const workspace = await db.query.businessWorkspaces.findFirst({
    where: and(eq(businessWorkspaces.id, workspaceId), eq(businessWorkspaces.isActive, true)),
  });
  if (!workspace) throw new NotFoundError('Business workspace');

  // Determine follower_type based on whether the user also owns a workspace
  const ownerMembership = await db.query.businessMembers.findFirst({
    where: and(eq(businessMembers.userId, userId), eq(businessMembers.isActive, true)),
  });
  const followerType = ownerMembership ? 'workspace' : 'user';

  await db
    .insert(businessFollowers)
    .values({
      id: createId(),
      workspaceId,
      userId,
      followerType,
      explicit: true,
      idempotent: true,
      independent: true,
    })
    .onConflictDoUpdate({
      target: [businessFollowers.workspaceId, businessFollowers.userId],
      set: { explicit: true, followerType },
    });

  // Update denormalized follower count on the workspace being followed
  await db
    .update(businessWorkspaces)
    .set({ followerCount: sql`(SELECT COUNT(*) FROM business_followers WHERE workspace_id = ${workspaceId})` })
    .where(eq(businessWorkspaces.id, workspaceId));

  // If the follower owns a workspace, increment its followingCount
  if (ownerMembership) {
    await db
      .update(businessWorkspaces)
      .set({ followingCount: sql`(SELECT COUNT(*) FROM business_followers WHERE user_id = ${userId})` })
      .where(eq(businessWorkspaces.id, ownerMembership.workspaceId));
  }
}

/** DELETE /businesses/:id/follow — idempotent opt-out */
export async function unfollowWorkspace(workspaceId: string, userId: string): Promise<void> {
  await db
    .delete(businessFollowers)
    .where(
      and(
        eq(businessFollowers.workspaceId, workspaceId),
        eq(businessFollowers.userId, userId),
      ),
    );

  // Update follower count on the unfollowed workspace
  await db
    .update(businessWorkspaces)
    .set({ followerCount: sql`(SELECT COUNT(*) FROM business_followers WHERE workspace_id = ${workspaceId})` })
    .where(eq(businessWorkspaces.id, workspaceId));

  // Update followingCount for the unfollower's workspace (if they own one)
  const ownerMembership = await db.query.businessMembers.findFirst({
    where: and(eq(businessMembers.userId, userId), eq(businessMembers.isActive, true)),
  });
  if (ownerMembership) {
    await db
      .update(businessWorkspaces)
      .set({ followingCount: sql`(SELECT COUNT(*) FROM business_followers WHERE user_id = ${userId})` })
      .where(eq(businessWorkspaces.id, ownerMembership.workspaceId));
  }
}

/** GET /businesses/:id/follow — returns follow status for the current user */
export async function getFollowStatus(workspaceId: string, userId: string): Promise<FollowStatusResponse> {
  const follow = await db.query.businessFollowers.findFirst({
    where: and(
      eq(businessFollowers.workspaceId, workspaceId),
      eq(businessFollowers.userId, userId),
    ),
  });
  return {
    isFollowing: !!follow,
    followedAt: follow?.createdAt.toISOString() ?? null,
  };
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

/**
 * GET /businesses/:id/campaigns/public — public list of live/closed campaigns.
 * No owner check — accessible to any authenticated user.
 */
export async function getPublicCampaigns(workspaceId: string): Promise<CampaignResponse[]> {
  const workspace = await db.query.businessWorkspaces.findFirst({
    where: eq(businessWorkspaces.id, workspaceId),
  });
  if (!workspace) throw new NotFoundError('Business workspace');

  const campaigns = await db.query.businessCampaigns.findMany({
    where: and(
      eq(businessCampaigns.workspaceId, workspaceId),
      // Only expose live and closed campaigns publicly (not drafts/publishing)
      sql`${businessCampaigns.state} IN ('live', 'closed')`,
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return campaigns.map(toCampaignResponse);
}

/** GET /businesses/:id/campaigns */
export async function getCampaigns(workspaceId: string, userId: string): Promise<CampaignResponse[]> {
  await requireOwner(workspaceId, userId);
  const campaigns = await db.query.businessCampaigns.findMany({
    where: eq(businessCampaigns.workspaceId, workspaceId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return campaigns.map(toCampaignResponse);
}

/** GET /businesses/:id/campaigns/:campaignId */
export async function getCampaign(
  workspaceId: string,
  campaignId: string,
  userId: string,
): Promise<CampaignResponse> {
  await requireOwner(workspaceId, userId);
  const campaign = await db.query.businessCampaigns.findFirst({
    where: and(
      eq(businessCampaigns.id, campaignId),
      eq(businessCampaigns.workspaceId, workspaceId),
    ),
  });
  if (!campaign) throw new NotFoundError('Campaign');
  return toCampaignResponse(campaign);
}

/** POST /businesses/:id/campaigns */
export async function createCampaign(
  workspaceId: string,
  userId: string,
  input: CreateCampaignInput,
): Promise<CampaignResponse> {
  await requireOwner(workspaceId, userId);

  const [campaign] = await db
    .insert(businessCampaigns)
    .values({
      id: createId(),
      workspaceId,
      title: input.title,
      mediaUrl: input.mediaUrl,
      textOverlay: input.textOverlay ?? null,
      isReplayable: input.isReplayable ?? false,
      state: 'draft',
    })
    .returning();

  return toCampaignResponse(campaign!);
}

/** PATCH /businesses/:id/campaigns/:campaignId */
export async function updateCampaign(
  workspaceId: string,
  campaignId: string,
  userId: string,
  input: UpdateCampaignInput,
): Promise<CampaignResponse> {
  await requireOwner(workspaceId, userId);

  const campaign = await db.query.businessCampaigns.findFirst({
    where: and(
      eq(businessCampaigns.id, campaignId),
      eq(businessCampaigns.workspaceId, workspaceId),
      eq(businessCampaigns.state, 'draft'),
    ),
  });
  if (!campaign) throw new NotFoundError('Draft campaign');

  const [updated] = await db
    .update(businessCampaigns)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.mediaUrl !== undefined && { mediaUrl: input.mediaUrl }),
      ...(input.textOverlay !== undefined && { textOverlay: input.textOverlay }),
      ...(input.isReplayable !== undefined && { isReplayable: input.isReplayable }),
      updatedAt: new Date(),
    })
    .where(eq(businessCampaigns.id, campaignId))
    .returning();

  return toCampaignResponse(updated!);
}

/** POST /businesses/:id/campaigns/:campaignId/publish — transitions to publishing */
export async function publishCampaign(
  workspaceId: string,
  campaignId: string,
  userId: string,
): Promise<void> {
  await requireOwner(workspaceId, userId);

  const campaign = await db.query.businessCampaigns.findFirst({
    where: and(
      eq(businessCampaigns.id, campaignId),
      eq(businessCampaigns.workspaceId, workspaceId),
      eq(businessCampaigns.state, 'draft'),
    ),
  });
  if (!campaign) throw new NotFoundError('Draft campaign');

  // Transition to publishing — BullMQ fan-out worker handles the rest (R4.1)
  await db
    .update(businessCampaigns)
    .set({ state: 'publishing', publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(businessCampaigns.id, campaignId));

  // TODO (task 3.4): enqueue BullMQ fan-out job here
  // For now, immediately mark as live so the client can proceed
  await db
    .update(businessCampaigns)
    .set({ state: 'live', updatedAt: new Date() })
    .where(eq(businessCampaigns.id, campaignId));
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

/**
 * GET /businesses/:id/metrics
 * Returns per-campaign delivery breakdown + workspace-level aggregates.
 * R5.1: aggregate counts only — no per-follower data exposed.
 */
export async function getMetrics(
  workspaceId: string,
  userId: string,
): Promise<MetricsResponse> {
  await requireOwner(workspaceId, userId);

  // All campaigns for this workspace
  const campaigns = await db.query.businessCampaigns.findMany({
    where: eq(businessCampaigns.workspaceId, workspaceId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  if (campaigns.length === 0) {
    return {
      workspaceId,
      totalCampaigns: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalViewed: 0,
      avgEngagementRate: 0,
      campaigns: [],
    };
  }

  // Aggregate delivery counts per campaign in one query
  const deliveryCounts = await db
    .select({
      campaignId: campaignDeliveries.campaignId,
      status: campaignDeliveries.status,
      total: count(),
    })
    .from(campaignDeliveries)
    .where(
      sql`${campaignDeliveries.campaignId} IN (${sql.join(campaigns.map((c) => sql`${c.id}`), sql`, `)})`,
    )
    .groupBy(campaignDeliveries.campaignId, campaignDeliveries.status);

  // Build per-campaign map
  const countMap = new Map<string, Record<string, number>>();
  for (const row of deliveryCounts) {
    if (!countMap.has(row.campaignId)) countMap.set(row.campaignId, {});
    countMap.get(row.campaignId)![row.status] = Number(row.total);
  }

  const campaignMetrics = campaigns.map((c) => {
    const m = countMap.get(c.id) ?? {};
    const queued = m.queued ?? 0;
    const delivered = m.delivered ?? 0;
    const failed = m.failed ?? 0;
    const opened = m.opened ?? 0;
    const viewed = m.viewed ?? 0;
    const engagementRate = delivered > 0 ? Math.round((viewed / delivered) * 100 * 10) / 10 : 0;
    const deliveryRate = queued > 0 ? Math.round((delivered / queued) * 100 * 10) / 10 : 0;

    return {
      campaignId: c.id,
      title: c.title,
      state: c.state,
      publishedAt: c.publishedAt?.toISOString() ?? null,
      queued,
      delivered,
      failed,
      opened,
      viewed,
      engagementRate,
      deliveryRate,
    };
  });

  // Workspace-level aggregates
  const totalDelivered = campaignMetrics.reduce((s, c) => s + c.delivered, 0);
  const totalOpened = campaignMetrics.reduce((s, c) => s + c.opened, 0);
  const totalViewed = campaignMetrics.reduce((s, c) => s + c.viewed, 0);
  const liveCampaigns = campaignMetrics.filter((c) => c.delivered > 0);
  const avgEngagementRate =
    liveCampaigns.length > 0
      ? Math.round((liveCampaigns.reduce((s, c) => s + c.engagementRate, 0) / liveCampaigns.length) * 10) / 10
      : 0;

  return {
    workspaceId,
    totalCampaigns: campaigns.length,
    totalDelivered,
    totalOpened,
    totalViewed,
    avgEngagementRate,
    campaigns: campaignMetrics,
  };
}

// ─── Campaign reactions ───────────────────────────────────────────────────────

/**
 * GET /businesses/:id/reactions
 * Returns all campaign reaction videos for the workspace.
 * Visible to: workspace owners (full list) and any authenticated user (public list).
 */
export async function getCampaignReactions(
  workspaceId: string,
): Promise<CampaignReactionsResponse> {
  const workspace = await db.query.businessWorkspaces.findFirst({
    where: eq(businessWorkspaces.id, workspaceId),
  });
  if (!workspace) throw new NotFoundError('Business workspace');

  // Get all campaigns for this workspace to join reactions against
  const campaigns = await db.query.businessCampaigns.findMany({
    where: eq(businessCampaigns.workspaceId, workspaceId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  if (campaigns.length === 0) {
    return { workspaceId, total: 0, reactions: [] };
  }

  const campaignIds = campaigns.map((c) => c.id);
  const campaignTitleMap = new Map(campaigns.map((c) => [c.id, c.title]));

  // Fetch reactions with reactor info
  const rows = await db
    .select({
      id: campaignReactions.id,
      campaignId: campaignReactions.campaignId,
      reactorId: campaignReactions.reactorId,
      videoUrl: campaignReactions.videoUrl,
      thumbnailUrl: campaignReactions.thumbnailUrl,
      createdAt: campaignReactions.createdAt,
      reactorDisplayName: users.displayName,
      reactorAvatarUrl: users.avatarUrl,
    })
    .from(campaignReactions)
    .innerJoin(users, eq(campaignReactions.reactorId, users.id))
    .where(sql`${campaignReactions.campaignId} IN (${sql.join(campaignIds.map((id) => sql`${id}`), sql`, `)})`)
    .orderBy(desc(campaignReactions.createdAt));

  return {
    workspaceId,
    total: rows.length,
    reactions: rows.map((r) => ({
      id: r.id,
      campaignId: r.campaignId,
      campaignTitle: campaignTitleMap.get(r.campaignId) ?? '',
      reactorId: r.reactorId,
      reactorDisplayName: r.reactorDisplayName,
      reactorAvatarUrl: r.reactorAvatarUrl ?? null,
      videoUrl: r.videoUrl,
      thumbnailUrl: r.thumbnailUrl ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/**
 * POST /businesses/:id/reactions
 * Submit a reaction video to a campaign. Only followers can react.
 */
export async function submitCampaignReaction(
  workspaceId: string,
  userId: string,
  input: SubmitReactionInput,
): Promise<void> {
  // Verify workspace exists
  const workspace = await db.query.businessWorkspaces.findFirst({
    where: and(eq(businessWorkspaces.id, workspaceId), eq(businessWorkspaces.isActive, true)),
  });
  if (!workspace) throw new NotFoundError('Business workspace');

  // Must be following to react
  const follow = await db.query.businessFollowers.findFirst({
    where: and(
      eq(businessFollowers.workspaceId, workspaceId),
      eq(businessFollowers.userId, userId),
    ),
  });
  if (!follow) throw new ForbiddenError('You must follow this business to react to their campaign');

  // Verify the campaign belongs to this workspace
  const campaign = await db.query.businessCampaigns.findFirst({
    where: and(
      eq(businessCampaigns.id, input.campaignId),
      eq(businessCampaigns.workspaceId, workspaceId),
    ),
  });
  if (!campaign) throw new NotFoundError('Campaign');

  await db
    .insert(campaignReactions)
    .values({
      id: createId(),
      campaignId: input.campaignId,
      reactorId: userId,
      videoUrl: input.videoUrl,
      thumbnailUrl: input.thumbnailUrl ?? null,
    })
    .onConflictDoUpdate({
      target: [campaignReactions.campaignId, campaignReactions.reactorId],
      set: {
        videoUrl: input.videoUrl,
        thumbnailUrl: input.thumbnailUrl ?? null,
      },
    });
}
