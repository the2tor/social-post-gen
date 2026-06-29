import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "El prompt de imagen es requerido" }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    
    if (!openAiKey) {
      console.warn("OPENAI_API_KEY no configurada, usando mock de generación de imagen.");
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
      return NextResponse.json({ imageBase64: mockImageBase64 });
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
