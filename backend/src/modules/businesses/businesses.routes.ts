import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import { createCampaignSchema, submitReactionSchema, updateCampaignSchema } from './businesses.schemas.js';
import * as businessService from './businesses.service.js';

export async function businessesRoutes(app: FastifyInstance) {
  // ── Authenticated routes (registered FIRST to avoid /:handle swallowing them) ──

  app.register(async (authed) => {
    authed.addHook('preHandler', authMiddleware);

    // GET /api/v1/businesses/mine
    authed.get('/mine', async (request) => {
      return businessService.getMyWorkspaces(request.user.userId);
    });

    // GET /api/v1/businesses/:id/overview
    authed.get('/:id/overview', async (request) => {
      const { id } = request.params as { id: string };
      return businessService.getStudioOverview(id, request.user.userId);
    });

    // GET /api/v1/businesses/:id/metrics
    authed.get('/:id/metrics', async (request) => {
      const { id } = request.params as { id: string };
      return businessService.getMetrics(id, request.user.userId);
    });

    // ── Follow ────────────────────────────────────────────────────────────────

    // GET /api/v1/businesses/:id/follow  — check follow status
    authed.get('/:id/follow', async (request) => {
      const { id } = request.params as { id: string };
      return businessService.getFollowStatus(id, request.user.userId);
    });

    // POST /api/v1/businesses/:id/follow
    authed.post('/:id/follow', async (request, reply) => {
      const { id } = request.params as { id: string };
      await businessService.followWorkspace(id, request.user.userId);
      return reply.status(204).send();
    });

    // DELETE /api/v1/businesses/:id/follow
    authed.delete('/:id/follow', async (request, reply) => {
      const { id } = request.params as { id: string };
      await businessService.unfollowWorkspace(id, request.user.userId);
      return reply.status(204).send();
    });

    // ── Reactions ─────────────────────────────────────────────────────────────

    // GET /api/v1/businesses/:id/reactions — list all campaign reaction videos
    authed.get('/:id/reactions', async (request) => {
      const { id } = request.params as { id: string };
      return businessService.getCampaignReactions(id);
    });

    // POST /api/v1/businesses/:id/reactions — submit a reaction video (followers only)
    authed.post('/:id/reactions', async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = submitReactionSchema.parse(request.body);
      await businessService.submitCampaignReaction(id, request.user.userId, input);
      return reply.status(204).send();
    });

    // ── Campaigns ────────────────────────────────────────────────────────────

    // GET /api/v1/businesses/:id/campaigns
    authed.get('/:id/campaigns', async (request) => {
      const { id } = request.params as { id: string };
      return businessService.getCampaigns(id, request.user.userId);
    });

    // GET /api/v1/businesses/:id/campaigns/public — public list (live/closed only)
    authed.get('/:id/campaigns/public', async (request) => {
      const { id } = request.params as { id: string };
      return businessService.getPublicCampaigns(id);
    });
    // GET /api/v1/businesses/:id/campaigns/:campaignId
    authed.get('/:id/campaigns/:campaignId', async (request) => {
      const { id, campaignId } = request.params as { id: string; campaignId: string };
      return businessService.getCampaign(id, campaignId, request.user.userId);
    });

    // POST /api/v1/businesses/:id/campaigns
    authed.post('/:id/campaigns', async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = createCampaignSchema.parse(request.body);
      const campaign = await businessService.createCampaign(id, request.user.userId, input);
      return reply.status(201).send(campaign);
    });

    // PATCH /api/v1/businesses/:id/campaigns/:campaignId
    authed.patch('/:id/campaigns/:campaignId', async (request) => {
      const { id, campaignId } = request.params as { id: string; campaignId: string };
      const input = updateCampaignSchema.parse(request.body);
      return businessService.updateCampaign(id, campaignId, request.user.userId, input);
    });

    // POST /api/v1/businesses/:id/campaigns/:campaignId/publish
    authed.post('/:id/campaigns/:campaignId/publish', async (request, reply) => {
      const { id, campaignId } = request.params as { id: string; campaignId: string };
      await businessService.publishCampaign(id, campaignId, request.user.userId);
      return reply.status(204).send();
    });
  });

  // ── Public routes (registered AFTER authenticated routes) ────────────────

  // GET /api/v1/businesses/:handle — consumer-safe public profile
  // Passes viewerUserId if authenticated so isFollowedByViewer is populated
  app.get('/:handle', async (request) => {
    const { handle } = request.params as { handle: string };
    const viewerUserId = (request.user as any)?.userId as string | undefined;
    return businessService.getWorkspaceByHandle(handle, viewerUserId);
  });
}
