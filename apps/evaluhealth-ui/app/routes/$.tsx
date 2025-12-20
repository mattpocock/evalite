import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMenuItemsQueryOptions } from "~/data/queries";

export const Route = createFileRoute("/$")({
  component: IndexRoute,
  loader: async ({ context }) => {
    const { queryClient } = context;
    const { evals: currentEvals } = await queryClient.ensureQueryData(
      getMenuItemsQueryOptions
    );

    const firstName = currentEvals[0]?.name;

    if (firstName) {
      return redirect({
        to: "/eval/$name",
        params: {
          name: firstName,
        },
      });
    }

    return null;
  },
});

function IndexRoute() {
  return <title>Evaluhealth</title>;
}
