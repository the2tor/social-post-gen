import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Servir imágenes almacenadas temporalmente para que las APIs de redes sociales
// (Instagram, TikTok) puedan acceder a ellas vía URL pública.
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const imgDir = path.join(process.cwd(), 'tmp', 'hosted-images');
    const filePath = path.join(imgDir, `${id}.jpg`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    const imageBuffer = fs.readFileSync(filePath);
    
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error("Error sirviendo imagen:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
