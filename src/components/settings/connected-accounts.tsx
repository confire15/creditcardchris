"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Building2, RefreshCw, Trash2, Plus, Loader2, CreditCard, Landmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type PlaidAccount = {
  id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string | null;
};

type PlaidItem = {
  id: string;
  item_id: string;
  institution_name: string | null;
  last_synced_at: string | null;
  plaid_accounts: PlaidAccount[];
};

export function ConnectedAccounts() {
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/plaid/accounts");
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function getLinkToken() {
    const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
    if (!res.ok) {
      toast.error("Upgrade to Premium to connect bank accounts");
      return;
    }
    const data = await res.json();
    setLinkToken(data.link_token);
  }

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token, metadata) => {
      try {
        const res = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token,
            institution: metadata.institution,
          }),
        });
        if (!res.ok) throw new Error("Exchange failed");

        // Sync transactions from the new item
        setSyncing("new");
        await fetch("/api/plaid/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        setSyncing(null);

        toast.success("Bank account connected and transactions synced!");
        setLinkToken(null);
        fetchAccounts();
      } catch {
        toast.error("Failed to connect account");
        setLinkToken(null);
      }
    },
    onExit: () => setLinkToken(null),
  });

  // Open Plaid Link as soon as token is ready
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  async function handleSync(itemId: string) {
    setSyncing(itemId);
    try {
      const res = await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = await res.json();
      toast.success(`Synced ${data.imported} new transactions`);
      fetchAccounts();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  async function handleDisconnect(itemId: string) {
    setDisconnecting(itemId);
    try {
      await fetch("/api/plaid/disconnect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      toast.success("Account disconnected");
      fetchAccounts();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  }

  const getAccountIcon = (type: string) => {
    if (type === "credit") return CreditCard;
    return Landmark;
  };

  if (loading) return <div className="h-32 bg-muted animate-pulse rounded-2xl" />;

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold">Connected Accounts</h2>
        </div>
        <Button size="sm" onClick={getLinkToken} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Connect Bank
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Connect your bank or credit card to automatically import transactions.
      </p>

      {items.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-xl">
          <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No accounts connected</p>
          <p className="text-xs text-muted-foreground mb-4">Connect your bank to automatically import transactions</p>
          <Button size="sm" variant="outline" onClick={getLinkToken} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Connect Bank
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="border border-border rounded-xl overflow-hidden">
              {/* Institution header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <div>
                  <p className="text-sm font-semibold">{item.institution_name ?? "Bank"}</p>
                  {item.last_synced_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Synced {formatDistanceToNow(new Date(item.last_synced_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(item.item_id)}
                    disabled={!!syncing}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                    title="Sync transactions"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing === item.item_id ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={() => handleDisconnect(item.item_id)}
                    disabled={disconnecting === item.item_id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Disconnect"
                  >
                    {disconnecting === item.item_id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Accounts list */}
              <div className="divide-y divide-border">
                {item.plaid_accounts.map((acct) => {
                  const Icon = getAccountIcon(acct.type);
                  return (
                    <div key={acct.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{acct.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {acct.subtype ?? acct.type}
                          {acct.mask && ` ···${acct.mask}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {syncing === "new" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Syncing transactions...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
