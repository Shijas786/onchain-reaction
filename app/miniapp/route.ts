export async function GET() {
  return new Response(
    `
    <html>
      <body>
        Loading Mini App…
      </body>
    </html>
    `,
    {
      headers: {
        "Farcaster-Miniapp": "v1",
        "Content-Type": "text/html",
      },
    }
  );
}
