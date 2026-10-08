// Redimensionamento de imagem no client antes do upload (avatar/logo) —
// evita mandar arquivos grandes pro banco, já que avatarUrl/logoUrl são
// salvos como data URL direto na coluna (sem storage externo configurado).

const AVATAR_LADO_PX = 256;
const LOGO_LARGURA_MAX_PX = 480;

/** Avatar: recorta em quadrado (centralizado) e redimensiona. */
export function redimensionarImagem(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_LADO_PX;
      canvas.height = AVATAR_LADO_PX;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas indisponível"));
        return;
      }
      const lado = Math.min(img.width, img.height);
      const sx = (img.width - lado) / 2;
      const sy = (img.height - lado) / 2;
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, AVATAR_LADO_PX, AVATAR_LADO_PX);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

/** Logo mantém a proporção original (não é recortada em quadrado como o avatar). */
export function redimensionarLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const escala = Math.min(1, LOGO_LARGURA_MAX_PX / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas indisponível"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}
