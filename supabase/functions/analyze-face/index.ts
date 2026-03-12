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

    const analysisPrompt = `Você é um visagista barbeiro profissional especialista em visagismo masculino, harmonização facial e cortes modernos.

Analise a foto do rosto deste cliente e as respostas do questionário abaixo:

${answersText}

Com base na foto e nas respostas, forneça:

1. **Formato do rosto** (oval, redondo, quadrado, retangular, triangular, diamante, oblong, coração)
2. **Nome do corte sugerido** - um corte real, executável em barbearia, moderno ou social conforme as preferências
3. **Explicação** (2-3 frases) de por que este corte harmoniza com o rosto do cliente
4. **Dicas de manutenção** (3-4 dicas práticas)

Responda APENAS em formato JSON com as chaves: face_shape, suggested_cut, cut_explanation, maintenance_tips`;

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
        suggested_cut: "Degradê Médio com Textura",
        cut_explanation: rawText.slice(0, 300),
        maintenance_tips: "Retoque a cada 15-20 dias.",
      };
    }

    // Step 2: Generate image with the suggested haircut
    const imagePrompt = `Photorealistic professional barbershop photo. Take this exact person and show them with a ${parsed.suggested_cut} haircut. 
Keep the same face, skin tone, facial features, age, and identity. 
Natural lighting, high definition, realistic barbershop result.
The haircut must look like it was done by a professional barber - clean, precise, and modern.
Do NOT change the person's identity. Do NOT make it look like art or illustration.`;

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
