import React, {useState} from 'react';
import './App.css';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";

import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import StopRoundedIcon from '@mui/icons-material/StopRounded';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';

import { useMediaRecorder } from './hooks/useMediaRecorder';
import { Waveform, WaveSurferPlayer } from './components';

function getPCM(blob) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      const arrayBuffer = fileReader.result;
      // Convert array buffer into audio buffer
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
        // Do something with audioBuffer
        const pcm = audioBuffer.getChannelData(0);
        resolve(pcm);
      }, err => reject(err));
    };
    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(blob);
  });
}

const App = () => {
  const [pcm, setPcm] = useState();
  const [audioUrl, setAudioUrl] = useState();
  // Create a Regions plugin instance
  const wsRegions = RegionsPlugin.create();

  const { start, stop, state } = useMediaRecorder({
    // constraints: { audio: true, video: false }, // audio only
    onStart: () => {
      setPcm(undefined)
      setAudioUrl(undefined)
    },
    onStop: async (audioChunks, type) => {
      const audioBlob = new Blob(audioChunks, { type });
      setPcm(await getPCM(audioBlob));
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      // audio.controls = true
      setAudioUrl(audioUrl)
      console.warn('audioUrl', audio)
      // audio.play();
    },
    onData: async (_, audioChunks) => {
      const audioBlob = new Blob(audioChunks);
      setPcm(await getPCM(audioBlob));
    },
  });
  return (
    <>
    <Container disableGutters={true} maxWidth="lg">
      <Box sx={{ bgcolor: '#cfe8fc', height: '100vh', }}>
        <Container disableGutters={true} sx={{position: 'absolute', bottom: '5vh', justifyContent: 'center', display: 'flex', width: '100%'}}>
          {
            state === 'inactive' ?
            <IconButton onClick={() => start(200)} >
              <KeyboardVoiceIcon sx={{ fontSize: 30, borderRadius: '100px', padding: '20px', backgroundColor: '#f03', color: 'white' }} />
            </IconButton> :
            <IconButton onClick={() => stop()}>
              <StopRoundedIcon sx={{ fontSize: 30, borderRadius: '100px', padding: '20px', backgroundColor: '#f03', color: 'white' }} />
            </IconButton>
          }
        </Container>
        <Container disableGutters={true} sx={{position: 'absolute', bottom: '15vh', width: '90vw',}}>
          {
            state === 'recording' && pcm && <Waveform pcm={pcm} />
          }
          {
            state !== 'recording' &&
            <WaveSurferPlayer
              height={100}
              waveColor="#ff4e00"
              progressColor="#dd5e98"
              cursorColor='#ddd5e9'
              cursorWidth={1}
              url={audioUrl}
              minPxPerSec={1} /** Minimum pixels per second of audio (i.e. zoom level) */
              wsRegions={wsRegions}
              interact={true}
              plugins={[
                wsRegions,
                TimelinePlugin.create(),
                MinimapPlugin.create({
                  height: 20,
                  waveColor: '#ddd',
                  progressColor: '#999',
                  // the Minimap takes all the same options as the WaveSurfer itself
                }),
              ]}
            />
          }
        </Container>
        
      </Box>
    </Container>
    </>
  );
};
export default App;
