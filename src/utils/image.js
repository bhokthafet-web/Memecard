// Card images are always shown in a circular frame, so there's no reason to
// store an uploaded photo at its original resolution/format — a phone photo
// can be several MB and isn't square. This center-crops to a square and
// re-encodes as a compressed JPEG at a fixed size before it's ever saved to
// localStorage or the database.
export function processCardImage(file, { size = 200, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // White backing so a transparent PNG doesn't turn black when
        // flattened to JPEG.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        const srcSize = Math.min(img.naturalWidth, img.naturalHeight);
        const srcX = (img.naturalWidth - srcSize) / 2;
        const srcY = (img.naturalHeight - srcSize) / 2;
        ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);

        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };

    img.src = url;
  });
}
