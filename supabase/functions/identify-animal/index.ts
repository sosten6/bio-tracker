import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      throw new Error('imageUrl is required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not set in environment');
    }

    // Call OpenAI GPT-4 Vision
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image for wildlife species. Respond ONLY with valid JSON: {"species_name": "scientific name", "common_name": "common name", "confidence": 95, "is_wildlife": true, "primary_image_url": "https://en.wikipedia.org/wiki/Species#/media/File:Image.jpg", "rejection_reason": null}. Set "is_wildlife": false and "rejection_reason" if not wild animal (e.g., pet, human, object). Confidence 0-100 based on clarity.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.status} ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const aiJsonString = aiData.choices[0].message.content.trim();
    const result = JSON.parse(aiJsonString);

    if (!result.species_name) {
      return new Response(
        JSON.stringify({
          species_name: "Unknown",
          common_name: "Unidentified",
          confidence: 0,
          is_wildlife: false,
          primary_image_url: null,
          rejection_reason: "AI analysis failed—try a clearer image"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({ 
        species_name: "Error",
        common_name: "Analysis Failed",
        confidence: 0,
        is_wildlife: false,
        primary_image_url: null,
        rejection_reason: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});