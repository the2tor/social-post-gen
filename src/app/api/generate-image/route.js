import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "El prompt de imagen es requerido" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiKey) {
      console.warn("GEMINI_API_KEY no configurada, usando mock de generación de imagen.");
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
      return NextResponse.json({ imageBase64: mockImageBase64 });
    }

    // Endpoint actualizado a generateContent para la API de Gemini (modelos recientes como gemini-2.5-flash-image o similar)
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
              { text: prompt + " . Genera solo una imagen fiel a esta descripción." }
            ]
          }
        ],
        generationConfig: {
          // Si el modelo lo requiere, especificar que queremos imagen u otros parámetros
        }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No se pudo generar la imagen");
    }

    // En los modelos unificados de Gemini, la imagen puede venir en partes
    const parts = data.candidates[0].content.parts;
    let b64Data = null;
    let mimeType = "image/jpeg";
    
    for (const part of parts) {
      if (part.inlineData) {
        b64Data = part.inlineData.data;
        mimeType = part.inlineData.mimeType || mimeType;
        break;
      } else if (part.executableCode) {
        continue;
      }
    }

    if (!b64Data) {
      throw new Error("El modelo no devolvió una imagen válida en la respuesta");
    }

    const imageBase64 = `data:${mimeType};base64,${b64Data}`;

    return NextResponse.json({ imageBase64 });

  } catch (error) {
    console.error("Error al generar imagen con Gemini:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
