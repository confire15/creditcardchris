import { redirect } from "next/navigation";

export default function AnnualFeesRedirect() {
  redirect("/wallet?tab=annual-fees");
}
