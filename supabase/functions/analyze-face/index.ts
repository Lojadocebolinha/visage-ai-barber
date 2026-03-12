import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { analysisId, photoUrl, answers } = await req.json();
    if (!analysisId || !photoUrl) throw new Error("Missing analysisId or photoUrl");

    // Step 1: Analyze face with text model
    const answersText = Object.entries(answers || {})
      .map(([q, a]) => `${q}: ${a}`)
      .join("\n");

    const analysisPrompt = `Você é um barbeiro visagista profissional especialista em visagismo masculino, consultoria de imagem e estética facial.

Analise a foto do rosto deste cliente com profundidade total. Considere também as respostas do questionário:

${answersText}

Faça uma análise profissional completa avaliando:
- formato do rosto (oval, redondo, quadrado, retangular, triangular, diamante)
- formato da mandíbula
- tamanho da testa
- proporção entre testa, nariz e queixo
- simetria do rosto
- tipo de cabelo atual
- volume do cabelo
- linha frontal
- estilo atual
- idade aparente

Com base nessa análise, sugira:
- Corte ideal (real, executável em barbearia)
- Tipo de fade recomendado
- Estilo do topo
- Barba ideal
- Bigode
- Dificuldade do corte
- Nível do barbeiro necessário

Inclua uma explicação profissional como um barbeiro premium explicaria ao cliente (2-3 frases detalhadas).
Inclua 4-5 dicas práticas de manutenção.

Responda APENAS em formato JSON com estas chaves:
face_shape, jaw_shape, forehead, proportion, current_style, contrast_level, recommended_style, suggested_cut, fade_type, top_style, beard_recommendation, mustache_recommendation, cut_difficulty, barber_level, cut_explanation, maintenance_tips`;

    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              { type: "image_url", image_url: { url: photoUrl } },
            ],
          },
        ],
      }),
    });

    if (!analysisResponse.ok) {
      const status = analysisResponse.status;
      if (status === 429) throw new Error("RATE_LIMITED");
      if (status === 402) throw new Error("PAYMENT_REQUIRED");
      throw new Error(`Analysis failed: ${status}`);
    }

    const analysisData = await analysisResponse.json();
    const rawText = analysisData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    let parsed: any;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = {
        face_shape: "Não identificado",
        jaw_shape: "",
        forehead: "",
        proportion: "",
        current_style: "",
        contrast_level: "",
        recommended_style: "",
        suggested_cut: "Degradê Médio com Textura",
        fade_type: "",
        top_style: "",
        beard_recommendation: "",
        mustache_recommendation: "",
        cut_difficulty: "",
        barber_level: "",
        cut_explanation: rawText.slice(0, 500),
        maintenance_tips: "Retoque a cada 15-20 dias.",
      };
    }

    // Step 2: Generate image with the suggested haircut
    const imagePrompt = `Fotografia profissional ultra-realista de barbearia premium. 
Aplique o corte "${parsed.suggested_cut}" com fade tipo "${parsed.fade_type || 'degradê médio'}" e topo "${parsed.top_style || 'texturizado'}".
${parsed.beard_recommendation ? `Barba: ${parsed.beard_recommendation}.` : ''}
${parsed.mustache_recommendation ? `Bigode: ${parsed.mustache_recommendation}.` : ''}

REGRAS OBRIGATÓRIAS:
- Manter EXATAMENTE o mesmo rosto, identidade, pele, idade e características faciais
- NÃO mudar formato do rosto
- NÃO transformar em outra pessoa
- Corte deve parecer real, feito por barbeiro profissional
- Estilo: foto de barbearia premium, câmera profissional, lente 50mm
- Iluminação de estúdio, 4K, alta definição
- Pele natural, sem filtros artísticos
- SEM cartoon, SEM anime, SEM desenho, SEM ilustração
- Resultado deve parecer uma foto REAL tirada após o corte`;

    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: imagePrompt },
              { type: "image_url", image_url: { url: photoUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    let generatedImageUrl: string | null = null;

    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (base64Image) {
        // Upload generated image to storage
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const fileName = `generated/${analysisId}.png`;

        const { error: uploadError } = await supabase.storage
          .from("analysis-photos")
          .upload(fileName, binaryData, { contentType: "image/png", upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("analysis-photos")
            .getPublicUrl(fileName);
          generatedImageUrl = urlData.publicUrl;
        }
      }
    }

    // Step 3: Update analysis record in DB
    const { error: updateError } = await supabase
      .from("analyses")
      .update({
        face_shape: parsed.face_shape,
        suggested_cut: parsed.suggested_cut,
        cut_explanation: parsed.cut_explanation,
        maintenance_tips: parsed.maintenance_tips,
        generated_image_url: generatedImageUrl,
        status: "completed",
      })
      .eq("id", analysisId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        face_shape: parsed.face_shape,
        suggested_cut: parsed.suggested_cut,
        cut_explanation: parsed.cut_explanation,
        maintenance_tips: parsed.maintenance_tips,
        generated_image_url: generatedImageUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("analyze-face error:", e);
    const msg = e.message || "Unknown error";
    const status = msg === "RATE_LIMITED" ? 429 : msg === "PAYMENT_REQUIRED" ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
