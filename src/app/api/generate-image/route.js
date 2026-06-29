import { NextResponse } from 'next/server';

import fs from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "El prompt de imagen es requerido" }, { status: 400 });
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

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json"
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    if (!data.data || data.data.length === 0) {
      throw new Error("No se pudo generar la imagen");
    }

    const b64Data = data.data[0].b64_json;
    const imageBase64 = `data:image/png;base64,${b64Data}`;

    return NextResponse.json({ imageBase64 });

  } catch (error) {
    console.error("Error al generar imagen con DALL-E:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
