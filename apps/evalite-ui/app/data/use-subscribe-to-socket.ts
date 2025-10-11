import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { getServerStateQueryOptions } from "./queries";
import type { Evalite } from "evalite/types";
import { DEFAULT_SERVER_PORT } from "evalite/constants";
import { isStaticMode } from "~/sdk";

export const useSubscribeToSocket = (queryClient: QueryClient) => {
  useEffect(() => {
    // Don't connect to WebSocket in static mode
    if (isStaticMode()) {
      return;
    }

    const socket = new WebSocket(
      `ws://localhost:${DEFAULT_SERVER_PORT}/api/socket`
    );

    socket.onmessage = async (event) => {
      const newState: Evalite.ServerState = JSON.parse(event.data);
      await queryClient.invalidateQueries();
      await queryClient.setQueryData(
        getServerStateQueryOptions.queryKey,
        newState
      );
    };

    return () => {
      socket.close();
    };
  }, [queryClient]);
};
