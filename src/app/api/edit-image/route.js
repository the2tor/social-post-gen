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

    // Preparar el FormData para enviar la imagen y el prompt
    const base64Data = image.split(',')[1] || image;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    // OpenAI images/edits requiere formato PNG. Lo simulamos aunque la fuente sea JPEG, 
    // el backend de OpenAI a menudo acepta el formato binario si la cabecera indica image/png
    const blob = new Blob([byteArray], { type: 'image/png' });

    const formData = new FormData();
    formData.append('image', blob, 'image.png');
    formData.append('prompt', prompt);
    formData.append('model', 'gpt-image-2'); // El modelo nuevo que pediste

    // Generar la nueva imagen editada nativamente usando la foto subida como base
    const dalleResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`
      },
      body: formData
    });

    const dalleData = await dalleResponse.json();
    if (dalleData.error) throw new Error(dalleData.error.message);
    
    if (!dalleData.data || dalleData.data.length === 0) {
      throw new Error("No se pudo generar la imagen modificada");
    }

    let imageBase64;
    if (dalleData.data[0].b64_json) {
      imageBase64 = `data:image/png;base64,${dalleData.data[0].b64_json}`;
    } else {
      const imageUrl = dalleData.data[0].url;
      const imgResponse = await fetch(imageUrl);
      const arrayBuffer = await imgResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
    }

    return NextResponse.json({ imageBase64 });

  } catch (error) {
    console.error("Error al editar imagen con OpenAI:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor al editar" }, { status: 500 });
  }
}
