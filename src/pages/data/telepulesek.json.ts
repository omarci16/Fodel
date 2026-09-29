import type { APIRoute } from 'astro';
import settlements from '~/data/market/hu-settlements.json';

export const prerender = true;
export const GET: APIRoute = () => new Response(JSON.stringify(settlements), {
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
});
