import { Alert } from 'react-native';
import { uploadMedia } from '../services/mediaUpload';

/**
 * Debug function to test media uploads directly
 * 
 * @param fileUri The URI of the file to upload
 * @param fileType The MIME type of the file
 */
export async function testMediaUpload(fileUri: string, fileType: string) {
  try {
    Alert.alert('Starting Upload Test', `Uploading file: ${fileUri}`);
    
    console.log('DEBUG: Starting test upload');
    console.log('DEBUG: File URI:', fileUri);
    console.log('DEBUG: File Type:', fileType);
    
    // Generate a filename
    const extension = fileType.split('/')[1] || 'jpg';
    const fileName = `debug_upload_${Date.now()}.${extension}`;
    
    // Try picture message type
    const result = await uploadMedia(fileUri, fileType, fileName, 'picture');
    
    console.log('DEBUG: Upload success!', result);
    Alert.alert(
      'Upload Successful', 
      `Media URL: ${result.media_url}\nFile Name: ${result.file_name}`
    );
    
    return result;
  } catch (error) {
    console.error('DEBUG: Upload failed', error);
    Alert.alert(
      'Upload Failed', 
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
} 