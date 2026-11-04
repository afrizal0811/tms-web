export async function resolveUserName(userOrEmail) {
  if (!userOrEmail) return 'System';
  if (!userOrEmail.includes('@')) return userOrEmail;

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;
    if (apiUrl && apiToken) {
      const externalUrl = new URL(`${apiUrl}/users`);
      externalUrl.searchParams.append('q', userOrEmail);
      externalUrl.searchParams.append('status', 'active');
      const res = await fetch(externalUrl.toString(), {
        headers: { Authorization: `Bearer ${apiToken}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const found =
          json.data?.find((u) => (u.email || '').toLowerCase() === userOrEmail.toLowerCase()) ||
          json.data?.[0];
        if (found?.name) return found.name;
      }
    }
  } catch (err) {
    console.warn('Gagal resolve user name dari MileApp:', err.message);
  }
  return userOrEmail;
}

