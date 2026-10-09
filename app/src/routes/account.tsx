import { createFileRoute } from "@tanstack/react-router";

import { AccountPage } from "@/components/commerce/account/account-page";
import { getAccount } from "@/lib/api/account.functions";

export const Route = createFileRoute("/account")({
  loader: () => getAccount(),
  head: () => ({
    meta: [
      { title: "Your account | PLATŌ Coffee" },
      { name: "description", content: "Sign in to your Platō account to see your orders and details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountRoute,
});

function AccountRoute() {
  const data = Route.useLoaderData();
  return <AccountPage data={data} />;
}
