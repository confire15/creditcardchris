import { redirect } from "next/navigation";

export default function WalletChallengesRedirect() {
  redirect("/wallet?tab=challenges");
}
