import { redirect } from "next/navigation";

export default function CreditsRedirect() {
  redirect("/wallet?tab=credits-benefits");
}
