// /account: signed-out (sign in / create account) or signed-in (orders, details).
import type { AccountData } from "@/lib/api/account.functions";

import { AccountDashboard } from "./account-dashboard";
import { AuthPanel } from "./auth-panel";
import "./account.css";

export function AccountPage({ data }: { data: AccountData }) {
  if (data.status === "signed-in") return <AccountDashboard customer={data.customer} orders={data.orders} />;
  return <AuthPanel unavailable={data.status === "unavailable"} />;
}
