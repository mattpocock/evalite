import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMenuItemsQueryOptions } from "~/data/queries";

export const Route = createFileRoute("/$")({
  component: IndexRoute,
  loader: async ({ context }) => {
    const { queryClient } = context;
    const { suites: currentSuites } = await queryClient.ensureQueryData(
      getMenuItemsQueryOptions
    );

    const firstName = currentSuites[0]?.name;

    if (firstName) {
      return redirect({
        to: "/suite/$name",
        params: {
          name: firstName,
        },
      });
    }

    return null;
  },
});

function IndexRoute() {
  return <title>Evalite</title>;
}
