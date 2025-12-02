import { apiRequest } from "@/api/base.js";

export type TrackEventRequest = {
  clientId: string;
  userId?: string | null;
  eventName: string;
  eventParams?: Record<string, any> | null;
};

export type TrackEventResponse = {
  success: boolean;
};

export const analyticsApi = {
  trackEvent: async (args: TrackEventRequest): Promise<TrackEventResponse> => {
    return apiRequest<TrackEventResponse>({
      path: "/analytics/track",
      method: "POST",
      body: args,
    });
  },
};
