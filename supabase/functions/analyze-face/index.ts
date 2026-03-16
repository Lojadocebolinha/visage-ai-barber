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
  if (!options.length) return "Fade Baixo";
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
    formal.includes("sim") ? "Contexto de trabalho: formal." : "Contexto de trabalho: não estritamente formal.",
    style.includes("moderno") ? "Vibe preferida: moderna." : "Vibe preferida: discreta/clássica.",
    pomade.includes("pomada") ? "Produto de estilo aceito." : "Acabamento natural preferido.",
    hairloss.includes("sim") ? "Tem recessão de linha de cabelo ou áreas de afinamento." : "Sem preferência clara de recessão de linha.",
    length.includes("sim") ? "Quer manter um pouco de comprimento no topo." : "Aberto a topo mais curto.",
    beard.includes("sim") ? "Geralmente usa barba." : "Geralmente sem barba.",
    maintenance.includes("sim") ? "Quer corte de baixa manutenção." : "Aceita manutenção média/alta.",
    change.includes("sim") ? "Aberto a mudança visual mais forte." : "Prefere mudanças conservadoras.",
  ];
}

function fallbackCutFromAnswers(answers: Record<string, unknown>, seed: string): string {
  const toLower = (value: unknown) => String(value || "").trim().toLowerCase();

  const style = toLower(answers.style);
  const maintenance = toLower(answers.maintenance);
  const formal = toLower(answers.formal);
  const change = toLower(answers.change);
  const hairloss = toLower(answers.hairloss);

  const allCuts = [
    "Fade Médio",
    "Fade Baixo",
    "Fade Alto",
    "Degradê Suave",
    "Burst Fade",
    "Corte Social",
    "Corte Tesoura",
    "Buzz Cut",
    "Crew Cut",
    "Mohawk",
    "Corte Clássico",
    "Corte Moderno",
    "Máquina #1",
    "Máquina #2",
    "Máquina #3",
    "Máquina #4",
    "Máquina #5",
  ];

  const modernCuts = [
    "Fade Médio",
    "Fade Alto",
    "Burst Fade",
    "Degradê Suave",
    "Corte Moderno",
  ];

  const classicCuts = [
    "Corte Social",
    "Corte Clássico",
    "Corte Tesoura",
    "Fade Baixo",
    "Crew Cut",
  ];

  let possibleCuts = [...allCuts];

  if (maintenance.includes("sim") && hairloss.includes("sim")) {
    possibleCuts = ["Buzz Cut", "Crew Cut", "Máquina #3"];
  } else if (maintenance.includes("sim")) {
    possibleCuts = ["Crew Cut", "Fade Baixo", "Buzz Cut", "Degradê Suave"];
  } else if (formal.includes("sim") && !change.includes("sim")) {
    possibleCuts = classicCuts;
  } else if (style.includes("moderno") || change.includes("sim")) {
    possibleCuts = modernCuts;
  }

  return pickSeededOption(seed, possibleCuts);
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
      "- Se a foto original não tem barba, mantenha feita.",
      "- NUNCA adicione barba.",
      "- NUNCA adicione bigode.",
      "- Não altere a estrutura da mandíbula.",
    ].join("\n");
  }

  if (beardRecommendation.includes("clean shave") || beardRecommendation.includes("barba feita")) {
    return [
      "- Limpeza solicitada.",
      "- Remova barba apenas se existir na foto original.",
      "- NUNCA adicione barba.",
      "- NUNCA adicione bigode.",
    ].join("\n");
  }

  return [
    "- Se barba existe, mantenha a menos que o estilo exija ajuste sutil.",
    "- Se sem barba, não adicione barba.",
    "- Altere barba apenas se realmente necessário para harmonia.",
    "- NUNCA mude a identidade facial.",
  ].join("\n");
}

// HuggingFace API calls
async function callLlavaAnalysis(
  HUGGINGFACE_API_KEY: string,
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const response = await fetch("https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: {
        image: `data:${mimeType};base64,${base64Image}`,
        prompt: prompt,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Llava analysis failed:", response.status, error);
    throw new Error(`Llava analysis failed: ${response.status}`);
  }

  const data = await response.json();
  return data[0]?.generated_text || "";
}

async function callMistralGeneration(
  HUGGINGFACE_API_KEY: string,
  prompt: string
): Promise<string> {
  const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Mistral generation failed:", response.status, error);
    throw new Error(`Mistral generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data[0]?.generated_text || "";
}

async function callStableDiffusion(
  HUGGINGFACE_API_KEY: string,
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<string | null> {
  try {
    const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_inference_steps: 50,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Stable Diffusion generation failed:", response.status, error);
      return null;
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("Stable Diffusion error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
    if (!HUGGINGFACE_API_KEY) throw new Error("HUGGINGFACE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { analysisId, photoUrl, answers } = await req.json();
    if (!analysisId || !photoUrl) throw new Error("Missing analysisId or photoUrl");

    const photoResponse = await fetch(photoUrl);
    if (!photoResponse.ok) throw new Error("Failed to fetch user photo");

    const mimeType = photoResponse.headers.get("content-type") || "image/jpeg";
    const base64Photo = cleanBase64(arrayBufferToBase64(await photoResponse.arrayBuffer()));

    // Normalize answers
    const normalizedAnswers = Object.fromEntries(
      Object.entries(answers || {}).map(([k, v]) => [k, String(v || "").toLowerCase()])
    );

    const answersText = Object.entries(normalizedAnswers)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const preferenceHints = buildPreferenceHints(normalizedAnswers);

    // Step 1: Analyze image with Llava 1.5
    const llavaPrompt = `Você é um barbeiro e visagista profissional. Analise esta foto de rosto e cabelo.

Responda EXCLUSIVAMENTE em Português do Brasil. Nenhuma palavra em inglês.

Analise:
- Formato do rosto (oval, redondo, quadrado, triangular, diamante, retangular)
- Tipo de cabelo (liso, ondulado, cacheado, crespo, afro)
- Textura do cabelo
- Volume do cabelo (fino, médio, espesso, muito espesso)
- Tamanho da testa
- Forma da mandíbula
- Presença de barba (sim/não)
- Proporções faciais

Respostas do questionário:
${answersText}

Dicas de preferência:
${preferenceHints.join("\n")}

Retorne APENAS JSON válido com as chaves:
face_shape, jaw_shape, forehead, forehead_size, proportion, hair_type, hair_texture, hair_volume, beard_presence, current_style, contrast_level, recommended_style, suggested_cut, fade_type, top_style, beard_recommendation, mustache_recommendation, cut_difficulty, barber_level, cut_explanation, maintenance_tips

Nomes de cortes permitidos (use estes nomes limpos):
- Fade Médio
- Fade Baixo
- Fade Alto
- Degradê Suave
- Burst Fade
- Corte Social
- Corte Tesoura
- Buzz Cut
- Crew Cut
- Mohawk
- Corte Clássico
- Corte Moderno
- Máquina #1, #2, #3, #4, #5

NÃO use underscores, hífens ou códigos. Use nomes limpos e profissionais.
Para maintenance_tips, retorne um array de strings curtas em Português (Brasil).`;

    console.log("Calling Llava for image analysis...");
    const llavaResponse = await callLlavaAnalysis(HUGGINGFACE_API_KEY, base64Photo, mimeType, llavaPrompt);

    let parsed: AnalysisFields = {};
    try {
      const match = llavaResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonText = (match?.[1] || llavaResponse).trim();
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = {
        face_shape: "oval",
        suggested_cut: "Fade Baixo Texturizado",
        beard_recommendation: "Barba curta alinhada",
        cut_explanation: llavaResponse.slice(0, 700) || "Corte equilibrado para valorizar suas proporções faciais.",
        maintenance_tips: ["Retoque a cada 2-3 semanas."],
      };
    }

    parsed.face_shape = normalizeFaceShape(parsed.face_shape);

    const recommendedCut = parsed.suggested_cut || fallbackCutFromAnswers(normalizedAnswers, analysisId);
    const beardStyle = parsed.beard_recommendation || "Mantenha barba existente naturalmente";
    const fadeStyle = parsed.fade_type || "Adapte fade à forma do rosto";
    const topStyle = parsed.top_style || "Mantenha textura natural";
    const beardRules = getBeardEditingRules(normalizedAnswers, parsed);

    // Step 2: Generate image with Stable Diffusion
    const imagePrompt = `Você é uma IA profissional de barbeiro visagista. Sua tarefa é gerar uma imagem realista mostrando um novo corte de cabelo.

ESTILO DE CORTE ALVO: ${recommendedCut}

REGRAS OBRIGATÓRIAS:
- Gere uma imagem realista de um rosto com o corte de cabelo sugerido.
- Preserve a identidade geral da pessoa (mesma forma de rosto, idade, gênero, tom de pele).
- Mantenha a textura natural e cor natural do cabelo.
- O corte deve ser um corte de barbeiro realista e profissional.
- Mantenha a mesma iluminação e fundo.
- NÃO rode ou distora a imagem.
- Qualidade profissional de corte de barbeiro.

CONTEXTO DE ANÁLISE:
- Forma do Rosto: ${parsed.face_shape || "desconhecida"}
- Tipo de Cabelo: ${parsed.hair_type || "desconhecido"}
- Volume do Cabelo: ${parsed.hair_volume || "desconhecido"}
- Presença de Barba: ${parsed.beard_presence || "desconhecida"}

Gere uma imagem de alta qualidade e realista refletindo o novo corte de cabelo.`;

    console.log("Calling Stable Diffusion for image generation...");
    let generatedDataUrl: string | null = await callStableDiffusion(HUGGINGFACE_API_KEY, base64Photo, mimeType, imagePrompt);

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

    // Step 3: Generate detailed explanation with Mistral
    const explanationPrompt = `Você é um barbeiro profissional. Explique em Português (Brasil) por que o corte "${recommendedCut}" é ideal para uma pessoa com:
- Formato de rosto: ${parsed.face_shape}
- Tipo de cabelo: ${parsed.hair_type}
- Volume de cabelo: ${parsed.hair_volume}

Forneça uma explicação profissional e detalhada (máximo 300 palavras). Responda EXCLUSIVAMENTE em Português (Brasil).`;

    console.log("Calling Mistral for explanation generation...");
    const explanationResponse = await callMistralGeneration(HUGGINGFACE_API_KEY, explanationPrompt);
    const cutExplanation = explanationResponse.slice(0, 1000) || parsed.cut_explanation || "Corte equilibrado para valorizar suas proporções faciais.";

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
        cut_explanation: cutExplanation || null,
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
        cut_explanation: cutExplanation,
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
