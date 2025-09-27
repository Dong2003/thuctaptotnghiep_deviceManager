import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { isBase64Image } from './imageUtils';

// Function to get a properly formatted download URL
export const getImageUrl = async (imagePath: string): Promise<string | null> => {
  try {
    // If it's already a full URL, return it
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // If it's a base64 image, return it directly
    if (isBase64Image(imagePath)) {
      return imagePath;
    }
    
    // If it's a storage path, get download URL
    const imageRef = ref(storage, imagePath);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting image URL:', error);
    return null;
  }
};

// Function to process incident images and get valid URLs
export const processIncidentImages = async (images: string[]): Promise<string[]> => {
  if (!images || images.length === 0) return [];
  
  const validUrls: string[] = [];
  
  for (const image of images) {
    try {
      const url = await getImageUrl(image);
      if (url) {
        validUrls.push(url);
      }
    } catch (error) {
      console.warn('Failed to process image:', image, error);
    }
  }
  
  return validUrls;
};

// Function to test if an image URL is accessible
export const testImageAccess = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn('Image access test failed:', url, error);
    return false;
  }
};
