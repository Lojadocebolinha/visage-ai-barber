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

    console.log("Starting analysis for:", analysisId);

    // Step 1: Download the photo and convert to base64 for the AI
    const photoResponse = await fetch(photoUrl);
    if (!photoResponse.ok) throw new Error("Failed to download photo");
    const photoBlob = await photoResponse.arrayBuffer();
    const photoBase64 = btoa(String.fromCharCode(...new Uint8Array(photoBlob)));
    const photoMimeType = photoResponse.headers.get("content-type") || "image/jpeg";

    console.log("Photo downloaded, size:", photoBlob.byteLength, "mime:", photoMimeType);

    // Step 2: Analyze face with text model
    const answersText = Object.entries(answers || {})
      .map(([q, a]) => `${q}: ${a}`)
      .join("\n");

    const analysisPrompt = `Você é um barbeiro visagista profissional especialista em visagismo masculino.

Analise a foto do rosto deste cliente com profundidade total. Considere as respostas do questionário:

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
              { type: "image_url", image_url: { url: `data:${photoMimeType};base64,${photoBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!analysisResponse.ok) {
      const status = analysisResponse.status;
      const body = await analysisResponse.text();
      console.error("Analysis API error:", status, body);
      if (status === 429) throw new Error("RATE_LIMITED");
      if (status === 402) throw new Error("PAYMENT_REQUIRED");
      throw new Error(`Analysis failed: ${status}`);
    }

    const analysisData = await analysisResponse.json();
    const rawText = analysisData.choices?.[0]?.message?.content || "";
    console.log("Analysis raw text length:", rawText.length);

    // Parse JSON from response
    let parsed: any;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.error("Failed to parse analysis JSON, using fallback");
      parsed = {
        face_shape: "Não identificado",
        suggested_cut: "Degradê Médio com Textura",
        cut_explanation: rawText.slice(0, 500),
        maintenance_tips: "Retoque a cada 15-20 dias.",
      };
    }

    console.log("Parsed analysis:", parsed.face_shape, parsed.suggested_cut);

    // Step 3: Generate image with the suggested haircut
    const imagePrompt = `You are a professional barber photo editor. Apply the following haircut to this person's photo.

HAIRCUT TO APPLY:
- Cut: ${parsed.suggested_cut}
- Fade: ${parsed.fade_type || 'mid fade'}
- Top: ${parsed.top_style || 'textured'}
${parsed.beard_recommendation ? `- Beard: ${parsed.beard_recommendation}` : ''}
${parsed.mustache_recommendation ? `- Mustache: ${parsed.mustache_recommendation}` : ''}

MANDATORY RULES:
- Keep the EXACT SAME face, identity, skin color, age, and facial features
- DO NOT change the face shape or create a different person
- Only change the hair and beard/mustache
- The result must look like a REAL professional barbershop photo
- Studio lighting, professional camera, 50mm lens, 4K quality
- Natural skin texture, no filters
- NO cartoon, NO anime, NO drawing, NO illustration
- The result must look like a real photo taken after the haircut`;

    console.log("Generating image with model google/gemini-3.1-flash-image-preview");

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
              { type: "image_url", image_url: { url: `data:${photoMimeType};base64,${photoBase64}` } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    let generatedImageUrl: string | null = null;

    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      console.log("Image response keys:", Object.keys(imageData));
      console.log("Image choices count:", imageData.choices?.length);

      if (imageData.choices?.[0]?.message) {
        const msg = imageData.choices[0].message;
        console.log("Message keys:", Object.keys(msg));
        console.log("Has images array:", !!msg.images, "length:", msg.images?.length);
        console.log("Message content preview:", (msg.content || "").slice(0, 200));

        // Try multiple paths to find the generated image
        let base64Image: string | null = null;

        // Path 1: images array (Lovable gateway format)
        if (msg.images && msg.images.length > 0) {
          base64Image = msg.images[0]?.image_url?.url || msg.images[0]?.url || null;
          console.log("Found image via images array, length:", base64Image?.length);
        }

        // Path 2: content parts with image
        if (!base64Image && Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === "image_url" && part.image_url?.url) {
              base64Image = part.image_url.url;
              console.log("Found image via content parts");
              break;
            }
          }
        }

        // Path 3: inline_data in content
        if (!base64Image && msg.content && typeof msg.content === "string") {
          const imgMatch = msg.content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
          if (imgMatch) {
            base64Image = imgMatch[0];
            console.log("Found image via regex in content");
          }
        }

        if (base64Image) {
          console.log("Processing base64 image, total length:", base64Image.length);

          // Clean base64 data
          let base64Data = base64Image;
          if (base64Data.includes(",")) {
            base64Data = base64Data.split(",")[1];
          }

          try {
            const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const fileName = `generated/${analysisId}.png`;

            console.log("Uploading generated image, size:", binaryData.byteLength);

            const { error: uploadError } = await supabase.storage
              .from("analysis-photos")
              .upload(fileName, binaryData, { contentType: "image/png", upsert: true });

            if (uploadError) {
              console.error("Upload error:", uploadError.message);
            } else {
              const { data: urlData } = supabase.storage
                .from("analysis-photos")
                .getPublicUrl(fileName);
              generatedImageUrl = urlData.publicUrl;
              console.log("Generated image uploaded:", generatedImageUrl);
            }
          } catch (e) {
            console.error("Base64 decode/upload error:", e);
          }
        } else {
          console.error("No image found in response. Full message:", JSON.stringify(msg).slice(0, 500));
        }
      }
    } else {
      const errBody = await imageResponse.text();
      console.error("Image generation failed:", imageResponse.status, errBody);
    }

    // Step 4: Update analysis record in DB
    const maintenanceTips = Array.isArray(parsed.maintenance_tips)
      ? parsed.maintenance_tips.join("\n• ")
      : parsed.maintenance_tips || "";

    const { error: updateError } = await supabase
      .from("analyses")
      .update({
        face_shape: parsed.face_shape,
        jaw_shape: parsed.jaw_shape || null,
        forehead: parsed.forehead || null,
        proportion: parsed.proportion || null,
        current_style: parsed.current_style || null,
        contrast_level: parsed.contrast_level || null,
        recommended_style: parsed.recommended_style || null,
        suggested_cut: parsed.suggested_cut,
        fade_type: parsed.fade_type || null,
        top_style: parsed.top_style || null,
        beard_recommendation: parsed.beard_recommendation || null,
        mustache_recommendation: parsed.mustache_recommendation || null,
        cut_difficulty: parsed.cut_difficulty || null,
        barber_level: parsed.barber_level || null,
        cut_explanation: parsed.cut_explanation,
        maintenance_tips: maintenanceTips,
        generated_image_url: generatedImageUrl,
        status: "completed",
      })
      .eq("id", analysisId);

    if (updateError) {
      console.error("DB update error:", updateError.message);
      throw updateError;
    }

    console.log("Analysis complete. Image generated:", !!generatedImageUrl);

    return new Response(
      JSON.stringify({
        success: true,
        face_shape: parsed.face_shape,
        suggested_cut: parsed.suggested_cut,
        cut_explanation: parsed.cut_explanation,
        maintenance_tips: maintenanceTips,
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
