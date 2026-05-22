import { redirect } from "next/navigation";

export default function BenefitsRedirect() {
  redirect("/wallet?tab=credits-benefits");
}
