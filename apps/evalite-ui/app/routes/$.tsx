import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getMenuItemsQueryOptions } from "~/data/queries";

const searchSchema = z.object({
  q: z.coerce.string().optional(),
});

export const Route = createFileRoute("/$")({
  component: IndexRoute,
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({
    q: search.q,
  }),
  loader: async ({ context, deps }) => {
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
        search: {
          q: deps.q,
        },
      });
    }

    return null;
  },
});

function IndexRoute() {
  return <title>Evalite</title>;
}
