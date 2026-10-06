import { redirect } from "next/navigation";

// Remarketing virou uma aba dentro de Follow-up — redirect pra quem tinha
// essa página salva/linkada antes da mudança.
export default function RemarketingRedirect() {
  redirect("/follow-up?tab=remarketing");
}
