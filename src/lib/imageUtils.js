/**
 * Adapta una imagen a unas dimensiones específicas añadiendo un fondo desenfocado
 * de la propia imagen si el aspect ratio no coincide.
 *
 * @param {string} imageBase64 - Imagen original en base64 o DataURL
 * @param {number} targetWidth - Ancho objetivo
 * @param {number} targetHeight - Alto objetivo
 * @returns {Promise<string>} - Imagen procesada en base64
 */
export const adaptImageToSize = (imageBase64, targetWidth, targetHeight) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("No se pudo obtener el contexto del canvas"));
        return;
      }

      const imgAspect = img.width / img.height;
      const targetAspect = targetWidth / targetHeight;

      // 1. Dibujar el fondo desenfocado (cover)
      let bgDrawWidth = targetWidth;
      let bgDrawHeight = targetHeight;
      let bgOffsetX = 0;
      let bgOffsetY = 0;

      if (imgAspect > targetAspect) {
        // La imagen es más ancha que el objetivo
        bgDrawHeight = targetWidth / imgAspect;
        bgDrawWidth = targetWidth; // Fill width, but actually we need to COVER height too
        // To cover:
        bgDrawWidth = targetHeight * imgAspect;
        bgDrawHeight = targetHeight;
        bgOffsetX = (targetWidth - bgDrawWidth) / 2;
      } else {
        // La imagen es más alta que el objetivo
        bgDrawWidth = targetWidth;
        bgDrawHeight = targetWidth / imgAspect;
        bgOffsetY = (targetHeight - bgDrawHeight) / 2;
      }

      ctx.save();
      // Aplicar filtro de desenfoque y oscurecimiento para el fondo
      ctx.filter = "blur(20px) brightness(0.6)";
      ctx.drawImage(img, bgOffsetX, bgOffsetY, bgDrawWidth, bgDrawHeight);
      ctx.restore();

      // 2. Dibujar la imagen principal centrada (contain)
      let mainDrawWidth = targetWidth;
      let mainDrawHeight = targetHeight;
      let mainOffsetX = 0;
      let mainOffsetY = 0;

      if (imgAspect > targetAspect) {
        // La imagen es más ancha (se ajusta al ancho y sobra alto)
        mainDrawHeight = targetWidth / imgAspect;
        mainOffsetY = (targetHeight - mainDrawHeight) / 2;
      } else {
        // La imagen es más alta (se ajusta al alto y sobra ancho)
        mainDrawWidth = targetHeight * imgAspect;
        mainOffsetX = (targetWidth - mainDrawWidth) / 2;
      }

      ctx.drawImage(img, mainOffsetX, mainOffsetY, mainDrawWidth, mainDrawHeight);

      // Devolver como Data URL
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => reject(new Error("Error al cargar la imagen para procesar"));
    img.src = imageBase64;
  });
};
