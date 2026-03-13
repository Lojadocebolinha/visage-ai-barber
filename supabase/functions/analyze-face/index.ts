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
    responseModalities: ["TEXT", "IMAGE"],
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

function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickSeededOption(seed: string, options: string[]): string {
  if (!options.length) return "Low Fade";
  const idx = hashString(seed) % options.length;
  return options[idx];
}

function buildPreferenceHints(answers: Record<string, unknown>): string[] {
  const toLower = (value: unknown) => String(value || "").trim().toLowerCase();

  const formal = toLower(answers.formal);
  const style = toLower(answers.style);
  const pomade = toLower(answers.pomade);
  const hairloss = toLower(answers.hairloss);
  const length = toLower(answers.length);
  const beard = toLower(answers.beard);
  const maintenance = toLower(answers.maintenance);
  const change = toLower(answers.change);

  return [
    formal.includes("sim") ? "Work context: formal." : "Work context: not strictly formal.",
    style.includes("moderno") ? "Preferred vibe: modern." : "Preferred vibe: discreet/classic.",
    pomade.includes("pomada") ? "Styling product accepted." : "Natural finish preferred.",
    hairloss.includes("sim") ? "Has hairline recession or thinning areas." : "No clear hairline recession preference.",
    length.includes("sim") ? "Wants to keep some top length." : "Open to shorter top.",
    beard.includes("sim") ? "Usually wears beard." : "Usually no beard.",
    maintenance.includes("sim") ? "Wants low-maintenance haircut." : "Accepts medium/high maintenance.",
    change.includes("sim") ? "Open to stronger visual change." : "Prefers conservative changes.",
  ];
}

function fallbackCutFromAnswers(answers: Record<string, unknown>, seed: string): string {
  const toLower = (value: unknown) => String(value || "").trim().toLowerCase();

  const style = toLower(answers.style);
  const maintenance = toLower(answers.maintenance);
  const formal = toLower(answers.formal);
  const change = toLower(answers.change);
  const hairloss = toLower(answers.hairloss);

  const modernCuts = [
    "Mid Fade with Textured Top",
    "High Fade Crop",
    "Burst Fade with Curly Top",
    "Taper Fade Quiff",
    "Modern Crew Cut",
  ];

  const classicCuts = [
    "Social Cut with Scissor Finish",
    "Classic Taper",
    "Layered Scissor Cut",
    "Low Fade Classic",
    "Crew Cut #3",
  ];

  if (maintenance.includes("sim") && hairloss.includes("sim")) {
    return pickSeededOption(seed, ["Buzz Cut #2", "Crew Cut #2 with Low Taper", "Machine #3 Classic"]);
  }

  if (maintenance.includes("sim")) {
    return pickSeededOption(seed, ["Crew Cut", "Low Fade #3", "Buzz Cut #3", "Taper Fade #4"]);
  }

  if (formal.includes("sim") && !change.includes("sim")) {
    return pickSeededOption(seed, classicCuts);
  }

  if (style.includes("moderno") || change.includes("sim")) {
    return pickSeededOption(seed, modernCuts);
  }

  return pickSeededOption(seed, [...classicCuts, ...modernCuts]);
}

function getBeardEditingRules(answers: Record<string, unknown>, parsed: AnalysisFields): string {
  const beardAnswer = String(answers.beard || "").toLowerCase();
  const beardPresence = String(parsed.beard_presence || "").toLowerCase();
  const beardRecommendation = String(parsed.beard_recommendation || "").toLowerCase();

  const noBeardContext =
    beardAnswer.includes("não") ||
    beardAnswer.includes("nao") ||
    beardPresence.includes("none") ||
    beardPresence.includes("sem") ||
    beardPresence.includes("clean");

  if (noBeardContext) {
    return [
      "- If the original photo has no beard, keep it clean-shaven.",
      "- NEVER add beard.",
      "- NEVER add mustache.",
      "- Do not alter jawline structure.",
    ].join("\n");
  }

  if (beardRecommendation.includes("clean shave") || beardRecommendation.includes("barba feita")) {
    return [
      "- Clean shave requested.",
      "- Remove beard only if beard exists in original photo.",
      "- NEVER add beard.",
      "- NEVER add mustache.",
    ].join("\n");
  }

  return [
    "- If beard exists, keep it unless style requires subtle adjustment.",
    "- If no beard, do not add beard.",
    "- Only change beard if truly needed for harmony.",
    "- NEVER change facial identity.",
  ].join("\n");
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

    const normalizedAnswers = (answers || {}) as Record<string, unknown>;
    const answersText = Object.entries(normalizedAnswers)
      .map(([q, a]) => `${q}: ${a}`)
      .join("\n");

    const preferenceHints = buildPreferenceHints(normalizedAnswers)
      .map((hint) => `- ${hint}`)
      .join("\n");

    const analysisPrompt = `You are a professional barber and visagist AI.

Analyze the uploaded photo and the questionnaire answers to select the best professional haircut for this exact person.

MANDATORY PROFESSIONAL ANALYSIS:
- face shape
- hair type
- hair texture
- hair volume
- forehead size
- jaw shape
- beard presence
- user preferences from form

HAIRCUT SELECTION RULES:
- Choose haircut professionally from facial/hair evidence + form preferences.
- Do NOT always choose the same haircut.
- Allowed styles include (not limited to): mid fade, low fade, high fade, taper fade, burst fade, social cut, scissor cut, layered cut, buzz cut, crew cut, mohawk, classic, modern, textured, machine 1-5.
- Explain why the chosen style fits this person.

Questionnaire answers:
${answersText}

Derived preference hints:
${preferenceHints}

Return ONLY valid JSON with keys:
face_shape, jaw_shape, forehead, forehead_size, proportion, hair_type, hair_texture, hair_volume, beard_presence, current_style, contrast_level, recommended_style, suggested_cut, fade_type, top_style, beard_recommendation, mustache_recommendation, cut_difficulty, barber_level, cut_explanation, maintenance_tips

For maintenance_tips, return an array of short strings.`;

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
    const rawContent = analysisData?.choices?.[0]?.message?.content;
    const rawText = extractMessageText(rawContent);

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

    const recommendedCut = parsed.suggested_cut || fallbackCutFromAnswers(normalizedAnswers, analysisId);
    const beardStyle = parsed.beard_recommendation || "Keep existing beard naturally";
    const fadeStyle = parsed.fade_type || "Adapt fade to face shape";
    const topStyle = parsed.top_style || "Maintain natural texture";
    const beardRules = getBeardEditingRules(normalizedAnswers, parsed);

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
${beardRules}

IMAGE RULES:
- Same angle as original photo.
- Same lighting.
- Same background.
- Same person.
- Front portrait.

BARBER EXECUTION RULES:
- Change only hair unless beard adjustment is explicitly needed.
- Keep natural hair texture and natural hair color unless needed for realism.
- Keep realistic professional barbershop result.
- Respect user questionnaire preferences.
- Analysis context: face shape (${parsed.face_shape || "unknown"}), hair type (${parsed.hair_type || "unknown"}), hair texture (${parsed.hair_texture || "unknown"}), hair volume (${parsed.hair_volume || "unknown"}), forehead (${parsed.forehead_size || parsed.forehead || "unknown"}), jaw (${parsed.jaw_shape || "unknown"}), beard (${parsed.beard_presence || "unknown"}).
- Preferred fade: ${fadeStyle}.
- Preferred top style: ${topStyle}.
- Beard recommendation context: ${beardStyle}.`;

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
