import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createApiClient } from "../lib/api.ts";
import type { ProductionStage } from "./types.ts";

export function useProductionBoard() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["production-board"],
    queryFn: () =>
      createApiClient(getToken).get<ProductionStage[]>(
        "/api/v1/production/board",
      ),
  });

  useEffect(() => {
    let socket: WebSocket | undefined;
    let retryTimer: number | undefined;
    let disposed = false;

    const connect = async () => {
      const token = await getToken();
      if (!token || disposed) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = import.meta.env.DEV ? "localhost:3000" : window.location.host;
      socket = new WebSocket(
        `${protocol}//${host}`,
        `clerk.${token}`,
      );
      socket.onmessage = () => {
        void queryClient.invalidateQueries({ queryKey: ["production-board"] });
      };
      socket.onclose = () => {
        if (!disposed) retryTimer = window.setTimeout(connect, 3000);
      };
    };

    void connect();
    return () => {
      disposed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [getToken, queryClient]);

  return query;
}

export function useProductionMutations() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const client = createApiClient(getToken);

  const move = useMutation({
    mutationFn: ({ jobId, stageId }: { jobId: string; stageId: string }) =>
      client.post(`/api/v1/production/jobs/${jobId}/move`, { stageId }),
    onMutate: async ({ jobId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: ["production-board"] });
      const previousBoard = queryClient.getQueryData<ProductionStage[]>([
        "production-board",
      ]);

      if (previousBoard) {
        queryClient.setQueryData<ProductionStage[]>(
          ["production-board"],
          previousBoard.map((stage) => ({
            ...stage,
            jobs: stage.jobs.filter((job) => job.id !== jobId),
          })).map((stage) => {
            const job = previousBoard
              .flatMap((candidate) => candidate.jobs)
              .find((candidate) => candidate.id === jobId);
            if (stage.id !== stageId || !job) return stage;
            return { ...stage, jobs: [...stage.jobs, job] };
          }),
        );
      }

      return { previousBoard };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(["production-board"], context.previousBoard);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["production-board"] }),
  });

  return { move };
}
