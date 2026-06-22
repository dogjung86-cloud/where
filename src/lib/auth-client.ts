export async function syncAuthenticatedProfile(accessToken: string) {
  const response = await fetch("/api/auth/profile", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(body?.error || "Unable to sync profile");
  }

  return response.json() as Promise<{
    profile: {
      id: string;
      displayName: string | null;
      walletAddress: string | null;
    };
  }>;
}
