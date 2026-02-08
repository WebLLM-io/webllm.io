import type { SearchResult } from './types';

interface SearchConfig {
  baseURL: string;
  apiKey: string;
  maxResults: number;
}

interface TavilyResponse {
  results: Array<{
    title: string;
    url: string;
    content: string;
  }>;
}

interface SearXNGResponse {
  results: Array<{
    title: string;
    url: string;
    content: string;
  }>;
}

function isTavilyURL(url: string): boolean {
  return url.includes('tavily') || url.includes('/search');
}

export async function searchWeb(
  query: string,
  config: SearchConfig,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const { baseURL, apiKey, maxResults } = config;

  if (isTavilyURL(baseURL)) {
    // Tavily API
    const url = baseURL.endsWith('/search') ? baseURL : `${baseURL}/search`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
      }),
      signal,
    });

    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data: TavilyResponse = await res.json();

    return data.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    }));
  }

  // SearXNG (GET with query params)
  const url = new URL(baseURL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('number_of_results', String(maxResults));

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data: SearXNGResponse = await res.json();

  return data.results.slice(0, maxResults).map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content,
  }));
}
