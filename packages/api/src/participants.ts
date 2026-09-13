import { apiClient } from './client';

export type InvitationStatus = 'NA' | 'INVITED' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface Invitation {
  code?: string;
  issuedAt?: string;
  expiresAt?: string;
  validity?: string;
  count?: number;
  status?: InvitationStatus | Record<string, string>;
  comments?: string;
  respondedAt?: string;
}

/** Per-step workflow status as returned on the participant record. */
export interface ParticipantWorkflowStepStatus {
  type?: string | Record<string, string>;
  updatedAt?: string | null;
  details?: Record<string, string>;
}

export interface ParticipantVM {
  id: string;
  auctionId?: string;
  emailId?: string;
  username?: string;
  mobileNo?: string;
  name?: string;
  alias?: string;
  profilePicture?: string;
  avatar?: string;
  invitation?: Invitation;
  /** Map of workflow step id → step completion status. Present when the
   *  participant has started or completed workflow steps. */
  workflowStatus?: Record<string, ParticipantWorkflowStepStatus>;
}

/** Request body for POST/PATCH /participants/me/workflow */
export interface ParticipantWorkflowStepRQ {
  /** The workflow step id being completed/updated. */
  id: string;
  /** Step type discriminator — required by the backend for deserialization. */
  type: string;
  /** For FORM_STEP / PARTICIPATION_FORM_STEP — StructDto with typeId + pathWiseState. */
  embedded?: { typeId?: string; pathWiseState?: Record<string, unknown> };
  /** For BANK_DETAIL_FORM_STEP — the id of an existing bank detail record. */
  bankDetailId?: string;
  /** For TNC_FORM_STEP — true when user accepts the terms. */
  accepted?: boolean;
  /** Fallback for other step types. */
  data?: Record<string, unknown>;
}

export interface PaginatedParticipants {
  content?: ParticipantVM[];
  page?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
    isFirst?: boolean;
    isLast?: boolean;
  };
}

/** POST /api/v1/auctions/{id}/participants/invitations — invite one person by email or mobile. */
export interface InvitationRQ {
  emailId?: string;
  mobileNo?: string;
  forceReInvite?: boolean;
}

export interface GetParticipantsFilter {
  phrases?: string[];
  invitationStatus?: InvitationStatus;
  page?: number;
  size?: number;
}

export const participantsApi = {
  /** Invites one person (existing user or not) to a restricted-access auction. */
  inviteParticipant: async (auctionId: string, data: InvitationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${auctionId}/participants/invitations`, data);
  },

  /** Self-service: the logged-in user joins/registers themselves as a participant.
   *  No request body. Returns 409 if the user is already a participant. */
  createSelfParticipant: async (auctionId: string): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${auctionId}/participants/me`, {});
  },

  getAllParticipants: async (
    auctionId: string,
    filter: GetParticipantsFilter = {},
  ): Promise<PaginatedParticipants> => {
    const { phrases, invitationStatus, page = 0, size = 20 } = filter;
    const response = await apiClient.get<PaginatedParticipants>(
      `/api/v1/auctions/${auctionId}/participants`,
      {
        params: {
          page,
          size,
          ...(phrases?.length ? { phrases } : {}),
          ...(invitationStatus ? { invitationStatus } : {}),
        },
      },
    );
    return response.data;
  },

  getParticipantById: async (id: string): Promise<ParticipantVM> => {
    const response = await apiClient.get<ParticipantVM>(`/api/v1/auctions/participants/${id}`);
    return response.data;
  },

  deleteParticipant: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/participants/${id}`);
  },

  deleteAllParticipants: async (auctionId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/${auctionId}/participants`);
  },

  /** Self-service: the logged-in user accepts their own invitation to an auction. */
  acceptInvitation: async (
    auctionId: string,
    data: { loginName: string; code: string },
  ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${auctionId}/participants/me/invitations/accept`, data);
  },

  /** Self-service: the logged-in user declines their own invitation to an auction.
   *  Uses the /declineSelf endpoint (no body required — identity derived from session). */
  declineInvitation: async (auctionId: string): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${auctionId}/participants/me/invitations/declineSelf`);
  },

  /** Self-service: complete a participant workflow step.
   *  POST creates the step submission for the first time. */
  completeWorkflowStep: async (
    auctionId: string,
    data: ParticipantWorkflowStepRQ,
  ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${auctionId}/participants/me/workflow`, data);
  },

  /** Self-service: update (amend) an already-submitted workflow step. */
  updateWorkflowStep: async (auctionId: string, data: ParticipantWorkflowStepRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/auctions/${auctionId}/participants/me/workflow`, data);
  },

  /** Fetch the current user's own participant record for the given auction.
   *  Returns the participant with workflowStatus populated. */
  getSelfParticipant: async (auctionId: string): Promise<ParticipantVM> => {
    const response = await apiClient.get<ParticipantVM>(
      `/api/v1/auctions/${auctionId}/participants/me`,
    );
    return response.data;
  },
};
