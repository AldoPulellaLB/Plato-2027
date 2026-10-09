import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // The story ("/") always opens on f01; restoring a mid-story position under
    // the preloader leaves the visitor with no context. Other pages restore.
    scrollRestoration: ({ location }) => location.pathname !== "/",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
