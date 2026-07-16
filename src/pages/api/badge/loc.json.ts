// src/pages/api/badge/loc.json.ts
// Generates a shields.io-compatible badge JSON at build time.
// Uses the same criteria as the website stats: only `code` lines,
// excluding non-programming languages (Markdown, JSON, TOML, SVG, etc.)

import type { APIRoute } from 'astro';

const EXCLUDED_LANGUAGES = [
  'Markdown', 'JSON', 'TOML', 'SVG', 'YAML',
  'Plain Text', 'INI', 'BASH', 'Dockerfile', 'Makefile'
];

function formatNumber(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    // Show one decimal only if it's not .0
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return n.toString();
}

export const GET: APIRoute = async () => {
  const repo = 'GenaDeev/spotifust';
  let codeLines = 0;

  try {
    const res = await fetch(`https://tokei.kojix2.net/api/github/${repo}`);
    if (res.ok) {
      const locData = await res.json();
      if (locData?.data?.languages) {
        for (const [lang, langStats] of Object.entries(locData.data.languages)) {
          if (!EXCLUDED_LANGUAGES.includes(lang)) {
            codeLines += (langStats as any).code || 0;
          }
        }
      }
    }
  } catch (e) {
    console.error('Error fetching tokei data for badge:', e);
  }

  const badge = {
    schemaVersion: 1,
    label: 'Lines of Code',
    message: codeLines > 0 ? formatNumber(codeLines) : 'N/A',
    color: 'blue',
  };

  return new Response(JSON.stringify(badge), {
    headers: { 'Content-Type': 'application/json' },
  });
};
