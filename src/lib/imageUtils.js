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

      let drawWidth = targetWidth;
      let drawHeight = targetHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > targetAspect) {
        // La imagen es más ancha: escalar en base al alto y centrar horizontalmente (recortar lados)
        drawWidth = targetHeight * imgAspect;
        drawHeight = targetHeight;
        offsetX = (targetWidth - drawWidth) / 2;
      } else {
        // La imagen es más alta: escalar en base al ancho y centrar verticalmente (recortar arriba/abajo)
        drawWidth = targetWidth;
        drawHeight = targetWidth / imgAspect;
        offsetY = (targetHeight - drawHeight) / 2;
      }

      // Dibujar la imagen recortada (cover)
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Devolver como Data URL
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => reject(new Error("Error al cargar la imagen para procesar"));
    img.src = imageBase64;
  });
};
