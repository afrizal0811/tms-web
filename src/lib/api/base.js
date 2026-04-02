export async function apiFetch(url, errorMessage, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || errorMessage);
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
    if (Array.isArray(data)) {
      return data;
    }
    if ((data && data.data === null) || (data && data.tasks === null)) {
      return [];
    }

    throw new Error(`Format data API tidak dikenal dari ${url}`);
  } catch (err) {
    throw err;
  }
}
