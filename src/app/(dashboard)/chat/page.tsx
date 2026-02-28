import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground text-base mt-2">
          Get personalized advice on maximizing your rewards
        </p>
      </div>
      <div className="max-w-2xl">
        <ChatInterface />
      </div>
    </div>
  );
}
