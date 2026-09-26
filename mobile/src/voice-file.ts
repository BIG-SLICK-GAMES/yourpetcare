export async function readVoice(uri:string) {
  const blob=await (await fetch(uri)).blob();
  if(blob.size>4*1024*1024)throw new Error('Try a shorter voice message.');
  const audio=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Could not read this recording.'));reader.readAsDataURL(blob);});
  return {audio,mimeType:blob.type.split(';')[0]||'audio/webm'};
}
export function discardVoice(uri:string) { URL.revokeObjectURL(uri); }
