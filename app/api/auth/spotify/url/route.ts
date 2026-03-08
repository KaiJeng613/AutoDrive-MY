import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Get the origin from the request or environment variable
  const origin = process.env.APP_URL || url.origin;
  const redirectUri = `${origin}/auth/callback`;
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: 'Missing SPOTIFY_CLIENT_ID' }, { status: 500 });
  }

  const scope = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('redirect_uri', redirectUri);

  return NextResponse.json({ url: authUrl.toString() });
}
