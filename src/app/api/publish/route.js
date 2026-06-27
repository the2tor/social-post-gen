import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { image, images, posts } = body;

    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn("N8N_WEBHOOK_URL no configurada en .env.local, simulando envío.");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json({ success: true, message: "Simulado (Webhook no configurado)" });
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_base64: image, // Original image
        images: images || {}, // Adapted images per platform
        instagram_post: posts.instagram,
        facebook_post: posts.facebook,
        tiktok_post: posts.tiktok,
        x_post: posts.x,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      throw new Error(`Error de n8n: ${response.statusText}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error al publicar:", error);
    return NextResponse.json({ error: error.message || "Error al conectar con n8n" }, { status: 500 });
  }
}
