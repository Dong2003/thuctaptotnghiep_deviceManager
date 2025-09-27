// Utility functions for handling images when Firebase Storage is not available

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log('Converting file to base64:', file.name, 'Size:', file.size);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        console.log('File converted to base64 successfully:', file.name);
        resolve(reader.result);
      } else {
        console.error('Failed to convert file to base64:', file.name);
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(reader.error);
    };
    reader.readAsDataURL(file);
  });
};

export const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
  return Promise.all(files.map(convertFileToBase64));
};

export const isBase64Image = (str: string): boolean => {
  return str.startsWith('data:image/') || str.startsWith('data:video/');
};

export const getImageSize = (base64String: string): number => {
  // Approximate size calculation for base64
  return Math.round((base64String.length * 3) / 4);
};

export const compressBase64Image = (base64String: string, maxSizeKB: number = 500): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(base64String);
        return;
      }

      // Calculate new dimensions
      let { width, height } = img;
      const maxDimension = 800; // Max width or height
      
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Try different quality levels
      let quality = 0.8;
      let compressed = canvas.toDataURL('image/jpeg', quality);
      
      while (getImageSize(compressed) > maxSizeKB * 1024 && quality > 0.1) {
        quality -= 0.1;
        compressed = canvas.toDataURL('image/jpeg', quality);
      }
      
      resolve(compressed);
    };
    
    img.onerror = () => resolve(base64String);
    img.src = base64String;
  });
};
