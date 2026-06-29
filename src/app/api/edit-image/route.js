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
      return NextResponse.json({ imageBase64: image }); // Devolvemos la misma imagen en mock
    }

    // Extraer solo la parte base64 sin el prefijo "data:image/jpeg;base64,"
    const base64Data = image.split(',')[1] || image;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${geminiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: prompt,
            image: {
              bytesBase64Encoded: base64Data
            }
          }
        ],
        parameters: {
          sampleCount: 1,
          editConfig: {
            editMode: "DEFAULT"
          },
          outputOptions: {
            mimeType: "image/jpeg"
          }
        }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    if (!data.predictions || data.predictions.length === 0) {
      throw new Error("No se pudo modificar la imagen");
    }

    const resultB64Data = data.predictions[0].bytesBase64Encoded;
    const imageBase64 = `data:image/jpeg;base64,${resultB64Data}`;

    return NextResponse.json({ imageBase64 });

  } catch (error) {
    console.error("Error al editar imagen con Gemini:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor al editar" }, { status: 500 });
  }
}
