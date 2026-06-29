import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "El prompt de imagen es requerido" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiKey) {
      // Mock para pruebas si no hay API key
      console.warn("GEMINI_API_KEY no configurada, usando mock de generación de imagen.");
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Devolvemos una imagen base64 de 1x1 pixel negro para la demo
      const mockImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
      return NextResponse.json({ imageBase64: mockImageBase64 });
    }

    // Usando el endpoint de Imagen 3 de Google AI Studio
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${geminiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: prompt
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
          outputOptions: {
            mimeType: "image/jpeg"
          }
        }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    if (!data.predictions || data.predictions.length === 0) {
      throw new Error("No se pudo generar la imagen");
    }

    const b64Data = data.predictions[0].bytesBase64Encoded;
    const imageBase64 = `data:image/jpeg;base64,${b64Data}`;

    return NextResponse.json({ imageBase64 });

  } catch (error) {
    console.error("Error al generar imagen con Gemini (Imagen 3):", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
