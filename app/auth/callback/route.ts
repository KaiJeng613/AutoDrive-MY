import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const origin = process.env.APP_URL || url.origin;
  const redirectUri = `${origin}/auth/callback`;
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret) {
    return new NextResponse('Missing parameters or environment variables', { status: 400 });
  }

  try {
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenResponse.json();

    if (data.access_token) {
      const html = `
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'SPOTIFY_AUTH_SUCCESS', token: '${data.access_token}' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `;
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
    } else {
      return new NextResponse(`Error: ${JSON.stringify(data)}`, { status: 400 });
    }
  } catch (error) {
    console.error('Spotify Auth Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
