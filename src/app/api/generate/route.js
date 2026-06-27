import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { image, context } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Imagen es requerida" }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    
    const systemPrompt = "Eres un experto community manager. Recibirás una imagen y un contexto. Debes usar las indicaciones del contexto para generar el tono, la temática y el estilo de los posts. Debes generar 4 copys adaptados para: 1. Instagram (visual, emojis, hashtags), 2. Facebook (conversacional, fomenta interacción), 3. TikTok (guion corto/texto en pantalla con hook viral), 4. X/Twitter (texto corto, conciso, directo, con hashtags relevantes). Devuelve ÚNICAMENTE un JSON válido con las claves exactas en minúscula: 'instagram', 'facebook', 'tiktok', 'x'. No añadas markdown ```json ni texto adicional.";
    const userPrompt = `Genera los posts siguiendo estrictamente estas indicaciones o contexto: ${context || "Crea un post genérico"}`;
    
    let generatedTexts = null;

    if (geminiKey) {
      // Extraer Base64 y MimeType de la imagen
      const [prefix, base64Data] = image.split(',');
      const mimeMatch = prefix.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`, {
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
            responseMimeType: "application/json"
          }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const rawText = data.candidates[0].content.parts[0].text;
      generatedTexts = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());

    } else if (openAiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: image } }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      generatedTexts = JSON.parse(data.choices[0].message.content);

    } else {
      // Mock de respuesta para pruebas de UI
      await new Promise(resolve => setTimeout(resolve, 2000));
      return NextResponse.json({
        instagram: `¡Increíble momento! 🌟\n\n${context ? `Sobre esto: ${context}\n\n` : ''}No te pierdas de todas nuestras novedades. ¿Qué te parece esta foto? Déjanos tu comentario 👇\n\n#novedades #momento #increible #tendencia`,
        facebook: `¡Hola a todos! 👋 Queríamos compartir con ustedes esta imagen especial.\n\n${context ? `Para darles un poco más de contexto: ${context}\n\n` : ''}Siempre estamos buscando formas de mejorar y nos encanta escuchar su opinión. ¡Comenta abajo qué opinas y no olvides compartir esta publicación con tus amigos! 🚀`,
        tiktok: `Hook (Texto en pantalla): ¡Lo que no te esperabas ver hoy! 🤯\n\nDescripción: Tienes que ver esto. ${context}\n¡Síguenos para más contenido así! 🔥 #viral #fyp #parati #tendencia`,
        x: `¡Novedades a la vista! 👀 ${context ? `${context} ` : ''}¿Estás listo para lo que viene? Descúbrelo aquí 👇 #Novedad #ÚltimaHora`
      });
    }

    return NextResponse.json(generatedTexts);

  } catch (error) {
    console.error("Error en generación:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
