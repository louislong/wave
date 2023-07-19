import React, {useState} from 'react';
import './App.css';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";

import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import StopRoundedIcon from '@mui/icons-material/StopRounded';

// import Crunker from 'crunker'

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';

import { useMediaRecorder } from './hooks/useMediaRecorder';
import { Waveform, WaveSurferPlayer } from './components';

const TIME_SLICES = 200; // in miliseconds
const WAVEFORM_DURATION = 5000; // 5 seconds

function getPCM(blob, counter) {
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

        const threshold = WAVEFORM_DURATION / TIME_SLICES
        if (counter > 25) {
          const start = Math.floor((counter - threshold) / counter * pcm.length)
          resolve(pcm.slice(start))
        } else {
          resolve(pcm);
        }

        // get the start according to the fixed value 10584
        // const NumberOfChunks = 10584 * 5000 / TIME_SLICES;  // 10584 one time, total size for 5 second
        // const startIndex = pcm.length > NumberOfChunks ? pcm.length - NumberOfChunks : 0

        // resolve(pcm.slice(startIndex));
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

      // let crunker = new Crunker();
      // let blobUrls = audioChunks.map(chunck => URL.createObjectURL(chunck))

      // crunker
      //   .fetchAudio(...blobUrls)
      //   .then((buffers) => {
      //     // => [AudioBuffer, AudioBuffer]
      //     return crunker.mergeAudio(buffers);
      //   })
      //   .then((merged) => {
      //     // => AudioBuffer
      //     return crunker.export(merged, 'audio/*');
      //   })
      //   .then((output) => {
      //     // => {blob, element, url}
      //     crunker.download(output.blob);
      //     // document.body.append(output.element);
      //     console.log(output.url);
      //     setAudioUrl(output.url)
      //   })
      //   .catch((error) => {
      //     // => Error Message
      //   });

      const audioBlob = new Blob(audioChunks, { type });
      // setPcm(await getPCM(audioBlob));
      const audioUrl = URL.createObjectURL(audioBlob);
      // const audio = new Audio(audioUrl);
      // audio.controls = true
      setAudioUrl(audioUrl)
      console.warn('audioUrl', audioUrl)
      // audio.play();
    },
    onData: async (counter, audioChunks) => {
      // const NumberOfChunks = 5000 / TIME_SLICES;
      // let FiveSecondChunks = audioChunks
      // if (audioChunks.length > NumberOfChunks) {
      //   FiveSecondChunks = audioChunks.slice(0, 1).concat(audioChunks.slice(audioChunks.length - NumberOfChunks))
      // }
      // const startIndex = audioChunks.length > NumberOfChunks ? audioChunks.length - NumberOfChunks : 0
      console.warn('counter', counter)
      const audioBlob = new Blob(audioChunks);
      setPcm(await getPCM(audioBlob, counter));
    },
  });
  return (
    <>
    <Container disableGutters={true} maxWidth="lg">
      <Box sx={{ bgcolor: '#cfe8fc', height: '100vh', }}>
        <Container disableGutters={true} sx={{position: 'absolute', bottom: '5vh', justifyContent: 'center', display: 'flex', width: '100%'}}>
          {
            state === 'inactive' ?
            <IconButton onClick={() => start(TIME_SLICES)} >
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
