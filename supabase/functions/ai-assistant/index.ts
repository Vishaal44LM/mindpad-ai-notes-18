import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, content, noteId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'summarize':
        systemPrompt = 'You are a helpful assistant that creates clear, concise summaries.';
        userPrompt = `Summarize the following note in 2-3 sentences:\n\n${content}`;
        break;
      case 'rewrite_formal':
        systemPrompt = 'You are a professional writing assistant that transforms text into formal, professional language.';
        userPrompt = `Rewrite the following text in a formal, professional tone:\n\n${content}`;
        break;
      case 'rewrite_concise':
        systemPrompt = 'You are a writing assistant that makes text more concise while preserving meaning.';
        userPrompt = `Rewrite the following text to be more concise:\n\n${content}`;
        break;
      case 'generate_ideas':
        systemPrompt = 'You are a creative assistant that generates innovative ideas based on given topics.';
        userPrompt = `Based on this note, generate 5 creative ideas or next steps:\n\n${content}`;
        break;
      default:
        throw new Error('Invalid action');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Save to AI history
    const { error: insertError } = await supabase
      .from('ai_history')
      .insert({
        note_id: noteId,
        prompt: action,
        ai_response: aiResponse,
      });

    if (insertError) {
      console.error('Error saving AI history:', insertError);
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
