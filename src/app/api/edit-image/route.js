import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { prompt, image } = await req.json();

    if (!prompt || !image) {
      return NextResponse.json({ error: "El prompt y la imagen son requeridos" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiKey) {
      console.warn("GEMINI_API_KEY no configurada, usando mock de edición de imagen.");
      await new Promise(resolve => setTimeout(resolve, 2000));
      return NextResponse.json({ imageBase64: image });
    }

    const base64Data = image.split(',')[1] || image;
    const mimeMatch = image.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt + " . Aplica estas modificaciones a la imagen proporcionada y devuelve solo la imagen resultante." },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No se pudo modificar la imagen");
    }

    const parts = data.candidates[0].content.parts;
    let resultB64Data = null;
    let resultMimeType = "image/jpeg";
    
    for (const part of parts) {
      if (part.inlineData) {
        resultB64Data = part.inlineData.data;
        resultMimeType = part.inlineData.mimeType || resultMimeType;
        break;
      }
    }

    if (!resultB64Data) {
      throw new Error("El modelo no devolvió una imagen modificada válida");
    }

    const imageBase64 = `data:${resultMimeType};base64,${resultB64Data}`;

    return NextResponse.json({ imageBase64 });

  } catch (error) {
    console.error("Error al editar imagen con Gemini:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor al editar" }, { status: 500 });
  }
}
