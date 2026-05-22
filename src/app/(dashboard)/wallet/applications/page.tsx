import { redirect } from "next/navigation";

export default function WalletApplicationsRedirect() {
  redirect("/wallet?tab=applications");
}
