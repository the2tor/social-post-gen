import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

    // Determinar la URL base del servidor (para servir imágenes públicamente)
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Guardar las imágenes adaptadas en disco y generar URLs públicas
    const imgDir = path.join(process.cwd(), 'tmp', 'hosted-images');
    if (!fs.existsSync(imgDir)) {
      fs.mkdirSync(imgDir, { recursive: true });
    }

    const batchId = crypto.randomUUID().slice(0, 8);
    const imageUrls = {};

    const platforms = ['instagram', 'facebook', 'tiktok', 'x'];
    for (const platform of platforms) {
      const base64Data = images?.[platform] || image;
      if (base64Data) {
        const rawBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const fileName = `${batchId}-${platform}`;
        const filePath = path.join(imgDir, `${fileName}.jpg`);
        fs.writeFileSync(filePath, Buffer.from(rawBase64, 'base64'));
        imageUrls[platform] = `${appUrl}/api/hosted-images/${fileName}`;
      }
    }

    // Enviar datos al webhook de n8n
    const payload = {
      // Textos de cada red social
      instagram_post: posts.instagram || '',
      facebook_post: posts.facebook || '',
      tiktok_post: posts.tiktok || '',
      x_post: posts.x || '',
      // URLs públicas de las imágenes adaptadas por plataforma
      instagram_image_url: imageUrls.instagram || '',
      facebook_image_url: imageUrls.facebook || '',
      tiktok_image_url: imageUrls.tiktok || '',
      x_image_url: imageUrls.x || '',
      // Metadata
      timestamp: new Date().toISOString(),
      batch_id: batchId
    };

    console.log("Enviando payload a n8n:", JSON.stringify(payload, null, 2));

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error de n8n (${response.status}): ${errorText}`);
    }

    // Programar limpieza de imágenes temporales después de 1 hora
    setTimeout(() => {
      for (const platform of platforms) {
        const fileName = `${batchId}-${platform}.jpg`;
        const filePath = path.join(imgDir, fileName);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) { /* ignorar errores de limpieza */ }
      }
    }, 3600000); // 1 hora

    return NextResponse.json({ success: true, imageUrls });

  } catch (error) {
    console.error("Error al publicar:", error);
    return NextResponse.json({ error: error.message || "Error al conectar con n8n" }, { status: 500 });
  }
}
