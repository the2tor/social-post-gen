import { NextResponse } from 'next/server';

import fs from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const { prompt, image } = await req.json();

    if (!prompt || !image) {
      return NextResponse.json({ error: "El prompt y la imagen son requeridos" }, { status: 400 });
    }

    let openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      try {
        const envPath = path.join(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/OPENAI_API_KEY=(.*)/);
        if (match) openAiKey = match[1].trim();
      } catch (e) {}
    }
    
    if (!openAiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY no detectada. Por favor, reinicia tu servidor (npm run dev)." }, { status: 500 });
    }

    // Paso 1: Usar GPT-4 Vision para crear un super-prompt descriptivo de DALL-E 3
    // Le pedimos que describa la imagen original pero aplicando el cambio del usuario.
    const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "Eres un experto en redactar prompts hiperdetallados para DALL-E 3. Tu tarea es analizar la imagen proporcionada y crear un prompt que reproduzca esa misma escena o sujeto, pero aplicando ESTRICTAMENTE las modificaciones o añadidos que te pide el usuario. Devuelve ÚNICAMENTE el prompt en inglés, sin introducciones ni explicaciones adicionales." 
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Modificación requerida: ${prompt}` },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    const visionData = await visionResponse.json();
    if (visionData.error) throw new Error(visionData.error.message);
    
    const dallePrompt = visionData.choices[0].message.content.trim();
    console.log("DALL-E 3 Prompt generado para edición:", dallePrompt);

    // Paso 2: Generar la nueva imagen con DALL-E 3 basada en el prompt de Vision
    const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: dallePrompt,
        n: 1,
        size: "1024x1024"
      })
    });

    const dalleData = await dalleResponse.json();
    if (dalleData.error) throw new Error(dalleData.error.message);
    
    if (!dalleData.data || dalleData.data.length === 0) {
      throw new Error("No se pudo generar la imagen modificada");
    }

    const imageUrl = dalleData.data[0].url;
    const imgResponse = await fetch(imageUrl);
    const arrayBuffer = await imgResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageBase64 = `data:image/png;base64,${buffer.toString('base64')}`;

    return NextResponse.json({ imageBase64 });

  } catch (error) {
    console.error("Error al editar imagen con OpenAI:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor al editar" }, { status: 500 });
  }
}
