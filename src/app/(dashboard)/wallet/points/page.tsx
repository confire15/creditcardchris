import { redirect } from "next/navigation";

export default function WalletPointsRedirect() {
  redirect("/wallet?tab=points");
}
