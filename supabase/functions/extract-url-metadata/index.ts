const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Lettora/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch URL: ${response.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();

    // Extract metadata from HTML
    const getMetaContent = (html: string, property: string): string | null => {
      // Try og: properties
      const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, 'i'));
      if (ogMatch) return ogMatch[1];

      // Try name= meta tags
      const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, 'i'));
      if (nameMatch) return nameMatch[1];

      return null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = getMetaContent(html, 'title') || (titleMatch ? titleMatch[1].trim() : null);
    const description = getMetaContent(html, 'description') || null;
    const image = getMetaContent(html, 'image') || null;

    // Make image URL absolute
    let absoluteImage = image;
    if (image && !image.startsWith('http')) {
      try {
        absoluteImage = new URL(image, formattedUrl).href;
      } catch {
        absoluteImage = image;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          title: title || '',
          description: description || '',
          image: absoluteImage || '',
          url: formattedUrl,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to extract metadata';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
