export function getGoogleOAuthOptions() {
  return {
    redirectTo: `${window.location.origin}/auth/callback`,
    queryParams: {
      prompt: "select_account",
    },
  };
}
