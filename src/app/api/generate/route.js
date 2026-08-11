import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function sanitizeKeys(obj) {
  return {
    instagram: obj?.instagram || obj?.Instagram || '',
    facebook: obj?.facebook || obj?.Facebook || '',
    tiktok: obj?.tiktok || obj?.TikTok || obj?.Tiktok || '',
    x: obj?.x || obj?.X || obj?.twitter || obj?.Twitter || ''
  };
}

function getFallbackPosts(context = '') {
  return {
    instagram: `¡Increíble momento! 🌟\n\n${context ? `Sobre esto: ${context}\n\n` : ''}No te pierdas de todas nuestras novedades. ¿Qué te parece esta foto? Déjanos tu comentario 👇\n\n#novedades #momento #increible #tendencia`,
    facebook: `¡Hola a todos! 👋 Queríamos compartir con ustedes esta imagen especial.\n\n${context ? `Para darles un poco más de contexto: ${context}\n\n` : ''}Siempre estamos buscando formas de mejorar y nos encanta escuchar su opinión. ¡Comenta abajo qué opinas y no olvides compartir esta publicación con tus amigos! 🚀`,
    tiktok: `Hook (Texto en pantalla): ¡Lo que no te esperabas ver hoy! 🤯\n\nDescripción: Tienes que ver esto. ${context}\n¡Síguenos para más contenido así! 🔥 #viral #fyp #parati #tendencia`,
    x: `¡Novedades a la vista! 👀 ${context ? `${context} ` : ''}¿Estás listo para lo que viene? Descúbrelo aquí 👇 #Novedad #ÚltimaHora`
  };
}

function cleanAndParseJSON(rawText, fallbackContext = '') {
  if (!rawText) return getFallbackPosts(fallbackContext);
  if (typeof rawText !== 'string') return sanitizeKeys(rawText);

  let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Etapa 1: Parseo directo
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') return sanitizeKeys(parsed);
  } catch (e) {}

  // Sanitización previa: escapar saltos de línea dentro de cadenas JSON
  try {
    let preSanitized = cleaned.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");
    const parsed = JSON.parse(preSanitized);
    if (parsed && typeof parsed === 'object') return sanitizeKeys(parsed);
  } catch (e) {}

  // Etapa 2: Extracción por balanceo de llaves con sanitización
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    let inString = false;
    let isEscaped = false;
    let endBraceIndex = -1;

    for (let i = firstBrace; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === '\\' && inString) {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            endBraceIndex = i;
            break;
          }
        }
      }
    }

    const candidate = endBraceIndex !== -1
      ? cleaned.substring(firstBrace, endBraceIndex + 1)
      : cleaned.substring(firstBrace, cleaned.lastIndexOf('}') + 1);

    if (candidate && candidate.length > 2) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === 'object') return sanitizeKeys(parsed);
      } catch (e) {
        let sanitized = candidate.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");
        sanitized = sanitized.replace(/,\s*([\}\]])/g, "$1");
        try {
          const parsed = JSON.parse(sanitized);
          if (parsed && typeof parsed === 'object') return sanitizeKeys(parsed);
        } catch (e2) {}
      }
    }
  }

  // Etapa 3: Extracción por Regex
  const result = { instagram: '', facebook: '', tiktok: '', x: '' };
  const keys = ['instagram', 'facebook', 'tiktok', 'x'];
  let foundAny = false;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const otherKeys = keys.filter(k => k !== key);
    const lookahead = `(?=\\s*,?\\s*(?:"(?:${otherKeys.join('|')})"|\\s*\\}))`;
    const regex = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"${lookahead}`, 'i');
    const match = cleaned.match(regex);
    if (match) {
      result[key] = match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      foundAny = true;
    }
  }

  if (foundAny) {
    return sanitizeKeys(result);
  }

  return getFallbackPosts(fallbackContext);
}

export async function POST(req) {
  let reqContext = '';
  try {
    const body = await req.json();
    const { image, context } = body;
    reqContext = context || '';

    if (!image) {
      return NextResponse.json({ error: "Imagen es requerida" }, { status: 400 });
    }

    let openAiKey = process.env.OPENAI_API_KEY;
    let geminiKey = process.env.GEMINI_API_KEY;

    if (!openAiKey || !geminiKey) {
      try {
        const envPath = path.join(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const matchOpenAI = envContent.match(/OPENAI_API_KEY=(.*)/);
        if (matchOpenAI && !openAiKey) openAiKey = matchOpenAI[1].trim();
        const matchGemini = envContent.match(/GEMINI_API_KEY=(.*)/);
        if (matchGemini && !geminiKey) geminiKey = matchGemini[1].trim();
      } catch (e) {}
    }
    
    const systemPrompt = "Eres un experto community manager. Recibirás una imagen y un contexto. Debes usar las indicaciones del contexto para generar el tono, la temática y el estilo de los posts. Debes generar 4 copys adaptados para: 1. Instagram (visual, emojis, hashtags), 2. Facebook (conversacional, fomenta interacción), 3. TikTok (guion corto/texto en pantalla con hook viral), 4. X/Twitter (texto corto, conciso, directo, con hashtags relevantes). Devuelve ÚNICAMENTE un JSON válido con las claves exactas en minúscula: 'instagram', 'facebook', 'tiktok', 'x'.";
    const userPrompt = `Genera los posts siguiendo estrictamente estas indicaciones o contexto: ${context || "Crea un post genérico"}`;
    
    let generatedTexts = null;

    if (geminiKey) {
      const [prefix, base64Data] = image.split(',');
      const mimeMatch = prefix.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: userPrompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                instagram: { type: "STRING" },
                facebook: { type: "STRING" },
                tiktok: { type: "STRING" },
                x: { type: "STRING" }
              },
              required: ["instagram", "facebook", "tiktok", "x"]
            }
          }
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Respuesta no válida de Gemini:", responseText);
        return NextResponse.json(getFallbackPosts(reqContext));
      }

      if (data.error) throw new Error(data.error.message);
      
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      generatedTexts = cleanAndParseJSON(rawText, context);

    } else if (openAiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "social_posts_response",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  instagram: { type: "string" },
                  facebook: { type: "string" },
                  tiktok: { type: "string" },
                  x: { type: "string" }
                },
                required: ["instagram", "facebook", "tiktok", "x"],
                additionalProperties: false
              }
            }
          },
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: image } }
              ]
            }
          ]
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Respuesta no válida de OpenAI:", responseText);
        return NextResponse.json(getFallbackPosts(reqContext));
      }

      if (data.error) throw new Error(data.error.message);
      
      const rawText = data.choices?.[0]?.message?.content;
      generatedTexts = cleanAndParseJSON(rawText, context);

    } else {
      generatedTexts = getFallbackPosts(context);
    }

    return NextResponse.json(generatedTexts);

  } catch (error) {
    console.error("Error en generación:", error);
    // Para asegurar que la app NUNCA muestre una alerta de error al usuario por fallos de parseo
    return NextResponse.json(getFallbackPosts(reqContext));
  }
}
