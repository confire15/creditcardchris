import { redirect } from "next/navigation";

export default function WalletOffersRedirect() {
  redirect("/wallet?tab=offers");
}
