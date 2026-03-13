import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AnalysisFields = {
  face_shape?: string;
  jaw_shape?: string;
  forehead?: string;
  forehead_size?: string;
  proportion?: string;
  hair_type?: string;
  hair_texture?: string;
  hair_volume?: string;
  beard_presence?: string;
  current_style?: string;
  contrast_level?: string;
  recommended_style?: string;
  suggested_cut?: string;
  fade_type?: string;
  top_style?: string;
  beard_recommendation?: string;
  mustache_recommendation?: string;
  cut_difficulty?: string;
  barber_level?: string;
  cut_explanation?: string;
  maintenance_tips?: string | string[];
};

function normalizeFaceShape(value?: string): string {
  const text = (value || "").toLowerCase();
  if (text.includes("oval")) return "oval";
  if (text.includes("redond") || text.includes("round")) return "round";
  if (text.includes("quadrad") || text.includes("square")) return "square";
  if (text.includes("triang")) return "triangle";
  if (text.includes("diam")) return "diamond";
  if (text.includes("retang") || text.includes("rectang")) return "rectangular";
  return "oval";
}

function cleanBase64(input: string): string {
  let cleaned = (input || "").trim();
  if (cleaned.includes(",") && cleaned.startsWith("data:")) {
    cleaned = cleaned.split(",")[1];
  }
  cleaned = cleaned.replace(/\s/g, "");
  return cleaned;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function extractImageDataUrl(payload: any): string | null {
  const fromChoices = payload?.choices?.[0]?.message;

  // OpenAI-compatible image path
  const choiceImage = fromChoices?.images?.[0]?.image_url?.url;
  if (typeof choiceImage === "string" && choiceImage.startsWith("data:image/")) {
    return choiceImage;
  }

  // Some gateways may return image in content array
  if (Array.isArray(fromChoices?.content)) {
    for (const part of fromChoices.content) {
      if (part?.image_url?.url && typeof part.image_url.url === "string") {
        const url = part.image_url.url;
        if (url.startsWith("data:image/")) return url;
      }
      if (part?.inline_data?.data && part?.inline_data?.mime_type) {
        return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
      }
      if (part?.inlineData?.data && part?.inlineData?.mimeType) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  // Gemini generateContent path
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (part?.inlineData?.data && part?.inlineData?.mimeType) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
      if (part?.inline_data?.data && part?.inline_data?.mime_type) {
        return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
      }
    }
  }

  // OpenAI image generation fallback path
  const b64 = payload?.data?.[0]?.b64_json;
  if (typeof b64 === "string") {
    return `data:image/png;base64,${b64}`;
  }

  return null;
}

async function callImageModel(
  LOVABLE_API_KEY: string,
  model: string,
  prompt: string,
  mimeType: string,
  base64Image: string
): Promise<string | null> {
  const payload = {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
        ],
      },
    ],
    modalities: ["image", "text"],
  };

  console.log("Calling image model:", model);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Image model failed:", model, response.status, body);
    return null;
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (typeof imageUrl === "string" && imageUrl.startsWith("data:image/")) {
    return imageUrl;
  }

  // Fallback extraction
  return extractImageDataUrl(data);
}

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

    const photoResponse = await fetch(photoUrl);
    if (!photoResponse.ok) throw new Error("Failed to fetch user photo");

    const mimeType = photoResponse.headers.get("content-type") || "image/jpeg";
    const base64Photo = cleanBase64(arrayBufferToBase64(await photoResponse.arrayBuffer()));

    const answersText = Object.entries(answers || {})
      .map(([q, a]) => `${q}: ${a}`)
      .join("\n");

    const analysisPrompt = `You are a professional male visagism barber AI.

When the user sends photo and questionnaire answers you must automatically:
1 analyze the face
2 detect face shape
3 suggest best haircut
4 suggest beard

Face analysis:
detect face shape, jaw, forehead, proportion, hair type, beard, style.

Face shape must be one: oval, round, square, triangle, diamond, rectangular.

Haircut suggestion must include: cut name, fade type, top size, beard style, style type.

Questionnaire answers:
${answersText}

Return ONLY valid JSON with keys:
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
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Photo}` } },
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

    let parsed: AnalysisFields = {};
    try {
      const match = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonText = (match?.[1] || rawText).trim();
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = {
        face_shape: "oval",
        suggested_cut: "Low Fade Texturizado",
        beard_recommendation: "Barba curta alinhada",
        cut_explanation: rawText.slice(0, 700) || "Corte equilibrado para valorizar suas proporções faciais.",
        maintenance_tips: ["Retoque a cada 2-3 semanas."],
      };
    }

    parsed.face_shape = normalizeFaceShape(parsed.face_shape);

    const recommendedCut = parsed.suggested_cut || "Low Fade";
    const beardStyle = parsed.beard_recommendation || "Clean shave";
    const fadeStyle = parsed.fade_type || "Low fade";
    const topStyle = parsed.top_style || "Textured top";

    const imagePrompt = `Professional barber visagism image editing.

TARGET STYLE: ${recommendedCut}

MANDATORY RULES:
- Use the uploaded image as the only reference.
- This is image-to-image editing.
- Do NOT generate a new person.
- Do NOT change identity.
- Do NOT replace the face.
- Keep 100% of original facial structure.
- Keep same eyes, nose, mouth, skin color, age and gender.
- Keep the exact same person.

FACIAL HAIR RULES:
- Clean shave requested.
- Remove beard only if beard exists.
- NEVER add beard.
- NEVER add mustache.
- NEVER change facial hair unless requested.

IMAGE RULES:
- Same angle as original photo.
- Same lighting.
- Same background.
- Same person.
- Front portrait.`;

    let generatedDataUrl: string | null = await callImageModel(
      LOVABLE_API_KEY,
      "google/gemini-3.1-flash-image-preview",
      imagePrompt,
      mimeType,
      base64Photo
    );

    if (!generatedDataUrl) {
      generatedDataUrl = await callImageModel(
        LOVABLE_API_KEY,
        "google/gemini-2.5-flash-image",
        imagePrompt,
        mimeType,
        base64Photo
      );
    }

    let generatedImageUrl: string | null = null;

    if (generatedDataUrl) {
      const rawB64 = cleanBase64(generatedDataUrl);
      const imageBytes = Uint8Array.from(atob(rawB64), (c) => c.charCodeAt(0));
      const fileName = `generated/${analysisId}.png`;

      const { error: uploadError } = await supabase.storage
        .from("analysis-photos")
        .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

      if (uploadError) {
        console.error("Generated image upload error:", uploadError.message);
      } else {
        const { data: urlData } = supabase.storage.from("analysis-photos").getPublicUrl(fileName);
        generatedImageUrl = urlData.publicUrl;
      }
    }

    if (!generatedImageUrl) {
      throw new Error("IMAGE_GENERATION_FAILED");
    }

    const tips = Array.isArray(parsed.maintenance_tips)
      ? parsed.maintenance_tips.join("\n• ")
      : (parsed.maintenance_tips || "");

    const { error: updateError } = await supabase
      .from("analyses")
      .update({
        face_shape: parsed.face_shape || null,
        jaw_shape: parsed.jaw_shape || null,
        forehead: parsed.forehead || null,
        proportion: parsed.proportion || null,
        current_style: parsed.current_style || null,
        contrast_level: parsed.contrast_level || null,
        recommended_style: parsed.recommended_style || null,
        suggested_cut: parsed.suggested_cut || null,
        fade_type: parsed.fade_type || null,
        top_style: parsed.top_style || null,
        beard_recommendation: parsed.beard_recommendation || null,
        mustache_recommendation: parsed.mustache_recommendation || null,
        cut_difficulty: parsed.cut_difficulty || null,
        barber_level: parsed.barber_level || null,
        cut_explanation: parsed.cut_explanation || null,
        maintenance_tips: tips || null,
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
        maintenance_tips: tips,
        generated_image_url: generatedImageUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    const msg = e.message || "Unknown error";
    console.error("analyze-face error:", msg);
    const status =
      msg === "RATE_LIMITED" ? 429 : msg === "PAYMENT_REQUIRED" ? 402 : msg === "IMAGE_GENERATION_FAILED" ? 500 : 500;

    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
