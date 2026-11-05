let userMapCache = {
  data: new Map(),
  expiresAt: 0,
};

export async function getMileAppUserMap() {
  const now = Date.now();
  if (userMapCache.expiresAt > now && userMapCache.data.size > 0) {
    return userMapCache.data;
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;
    if (apiUrl && apiToken) {
      const externalUrl = new URL(`${apiUrl}/users`);
      externalUrl.searchParams.append('status', 'active');
      externalUrl.searchParams.append('limit', '1000');
      const res = await fetch(externalUrl.toString(), {
        headers: { Authorization: `Bearer ${apiToken}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const map = new Map();
        (json.data || []).forEach((u) => {
          if (u.email) {
            map.set(u.email.toLowerCase().trim(), u.name || u.email);
          }
        });
        userMapCache = {
          data: map,
          expiresAt: now + 30 * 60 * 1000,
        };
        return map;
      }
    }
  } catch (err) {
    console.warn('Gagal mengambil daftar users dari MileApp:', err.message);
  }

  return userMapCache.data || new Map();
}

export async function resolveUserName(userOrEmail) {
  if (!userOrEmail) return 'System';
  if (!userOrEmail.includes('@')) return userOrEmail;

  const email = userOrEmail.toLowerCase().trim();
  const map = await getMileAppUserMap();
  if (map.has(email)) {
    return map.get(email);
  }

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
          json.data?.find((u) => (u.email || '').toLowerCase() === email) ||
          json.data?.[0];
        if (found?.name) {
          map.set(email, found.name);
          return found.name;
        }
      }
    }
  } catch (err) {
    console.warn('Gagal resolve user name dari MileApp:', err.message);
  }
  return userOrEmail;
}
