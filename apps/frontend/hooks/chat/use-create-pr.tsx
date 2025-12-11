interface CreatePRResponse {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  messageId?: string;
  error?: string;
}

export function useCreatePR() {
  const mutate = (taskId: string): Promise<CreatePRResponse> => {
    return fetch(`/api/tasks/${taskId}/pull-request`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return {
            success: false,
            error: text || `Failed to create pull request (${res.status})`,
          };
        }
        return (await res.json()) as CreatePRResponse;
      })
      .catch((err) => ({
        success: false,
        error: err instanceof Error ? err.message : "Failed to create pull request",
      }));
  };

  // Wrap Convex action to provide React Query-like interface
  return {
    mutate,
    mutateAsync: mutate,
    isPending: false, // Convex actions don't have built-in pending state
  };
}
