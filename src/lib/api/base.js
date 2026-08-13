const fetchWithRetry = async (fn, { retries = 3, baseMs = 700 } = {}) => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const status = err?.response?.status || err?.status || null;
      if (attempt > retries || (status && status >= 400 && status < 500 && status !== 429)) {
        throw err;
      }
      const delay = baseMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export async function apiFetch(url, errorMessage, options = {}) {
  return fetchWithRetry(async () => {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.error || errorMessage);
      err.status = response.status;
      throw err;
    }

    if (data && data.message) {
      return data;
    }
    if (data && data.tasks && Array.isArray(data.tasks.data)) {
      return data.tasks.data;
    }
    if (data && data.data && Array.isArray(data.data.data)) {
      return data.data.data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    if ((data && data.data === null) || (data && data.tasks === null)) {
      return [];
    }

    if (data && typeof data === 'object') {
      return data;
    }

    throw new Error(`Format data API tidak dikenal dari ${url}`);
  });
}
