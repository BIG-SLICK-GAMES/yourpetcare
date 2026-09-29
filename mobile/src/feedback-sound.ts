import { createAudioPlayer } from 'expo-audio';
let player:ReturnType<typeof createAudioPlayer>|null=null;
let releaseTimer:ReturnType<typeof setTimeout>|undefined;
export function prepareSound(){}
export function playSuccess(){
  try{
    if(releaseTimer)clearTimeout(releaseTimer);
    player??=createAudioPlayer(require('../assets/sounds/complete.wav'));
    player.volume=.35;
    const current=player;
    void current.seekTo(0).then(()=>current.play()).catch(()=>{});
    releaseTimer=setTimeout(()=>{current.release();if(player===current)player=null;},3000);
  }catch{}
}
