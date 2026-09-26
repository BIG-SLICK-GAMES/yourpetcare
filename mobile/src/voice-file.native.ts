import { File } from 'expo-file-system';
export async function readVoice(uri:string) {
  const file=new File(uri);
  if(file.size>4*1024*1024)throw new Error('Try a shorter voice message.');
  return {audio:await file.base64(),mimeType:'audio/m4a'};
}
export function discardVoice(uri:string) { try {const file=new File(uri);if(file.exists)file.delete();}catch{} }
