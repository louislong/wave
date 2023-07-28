import React, {useEffect, useState, useCallback} from 'react';
import './App.css';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";

import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { green, purple } from '@mui/material/colors';


// import Crunker from 'crunker'

import Box from '@mui/material/Box';
import { Grid } from '@mui/material';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';

import { useMediaRecorder } from './hooks/useMediaRecorder';
import { Waveform, WaveSurferPlayer } from './components';
import audioBufferToWav from './util/bufferToWav';

const TIME_SLICES = 200; // in miliseconds
const WAVEFORM_DURATION = 5000; // 5 seconds

function getPCM(willConvert, blob, counter) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      const arrayBuffer = fileReader.result;
      // Convert array buffer into audio buffer
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
        if (willConvert) {
          const wav = audioBufferToWav(audioBuffer)
          const blob = new window.Blob([ new DataView(wav) ], {
            type: 'audio/wav'
          })
          resolve(blob);
        } else {
          // get 5 seconds pcm data
          const pcm = audioBuffer.getChannelData(0);

          // const threshold = WAVEFORM_DURATION / TIME_SLICES
          // if (counter > 25) {
          //   const start = Math.floor((counter - threshold) / counter * pcm.length)
          //   resolve(pcm.slice(start))
          // } else {
          //   resolve(pcm);
          // }
          resolve(pcm)
        }
      }, err => reject(err));
    };
    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(blob);
  });
}

const theme = createTheme({
  palette: {
    primary: {
      light: purple[300],
      main: purple[500],
      dark: purple[700],
      contrastText: '#fff',
    },
    secondary: {
      light: green[300],
      main: green[500],
      dark: green[700],
      contrastText: '#fff',
    },
  },
});

const App = () => {
  const [pcm, setPcm] = useState();
  const [audioUrl, setAudioUrl] = useState();
  const [wavUrl, setWavUrl] = useState();
  const [wavBlob, setWavBlob] = useState();
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [anaylzeResult, setAnalyzeResult] = useState()
  // Create a Regions plugin instance
  const wsRegions = RegionsPlugin.create();

  const { start, stop, state } = useMediaRecorder({
    // constraints: { audio: true, video: false }, // audio only
    onStart: () => {
      setPcm(undefined)
      setAudioUrl(undefined)
      setAnalyzeResult(undefined)
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
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl)
      const blob = await getPCM(true, audioBlob)
      setWavBlob(blob)
      const wavUrl = URL.createObjectURL(blob)
      setWavUrl(wavUrl)
    },
    onData: async (counter, audioChunks) => {
      console.warn('counter', counter)
      const audioBlob = new Blob(audioChunks);
      setPcm(await getPCM(false, audioBlob, counter));
    },
  });
  // useEffect(() => {
  //   start(TIME_SLICES)
  // }, [])

  const handleData = useCallback(() => {
    const formData = new FormData();
    const file = new File([wavBlob], 'test.wav')

    formData.append('file', file);
    setAnalyzeResult(undefined)
    setIsAnalyzing(true)

    fetch('https://stethy.pdi.lab126.a2z.com/StethyAPI', {
      method: 'POST',
      headers: {
        // 'Content-Type': 'multipart/form-data',
        // 'Content-Type': 'audio/wave',
        'Accept': '*/*',
      },
      body: formData
    })
    .then((response) => response.text())
    .then((result) => {
      setIsAnalyzing(false)
      setAnalyzeResult(result)
      console.log('Success:', result);
    })
    .catch((error) => {
      setIsAnalyzing(false)
      setAnalyzeResult(error)
      console.error('Error:', error);
    });
  }, [wavBlob])

  return (
    <ThemeProvider theme={theme}>
       <Box sx={{ flexGrow: 1, backgroundColor: 'lightblue' }}>
        <Grid direction="column" justifyContent="center" alignItems="center" container spacing={2} sx={{ height: '100vh', width: '100vw'}}>
          <Grid item sx={{ display: 'flex' }} xs={10} justifyContent="center" alignItems="center">
            <Container disableGutters sx={{width: '100vw'}}>
            {
              state === 'recording' && pcm && <Waveform pcm={pcm} />
            }
            {
              state !== 'recording' &&
              <WaveSurferPlayer
                height={200}
                barHeight={5}
                waveColor="darkblue"
                progressColor="#ff4e00"
                // cursorColor='#ddd5e9'
                cursorWidth={1}
                url={audioUrl}
                wavUrl={wavUrl}
                minPxPerSec={1} /** Minimum pixels per second of audio (i.e. zoom level) */
                wsRegions={wsRegions}
                interact={true}
                handleData={handleData}
                isAnalyzing={isAnalyzing}
                anaylzeResult={anaylzeResult}
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
          </Grid>
          <Grid item xs={2}>
            {
              state === 'inactive' ?
              <IconButton disabled={isAnalyzing} onClick={() => start(TIME_SLICES)} >
                <KeyboardVoiceIcon sx={{ fontSize: 30, borderRadius: '100px', padding: '20px', backgroundColor: '#f03', color: 'white' }} />
              </IconButton> :
              <IconButton onClick={() => stop()}>
                <StopRoundedIcon sx={{ fontSize: 30, borderRadius: '100px', padding: '20px', backgroundColor: '#f03', color: 'white' }} />
              </IconButton>
            }
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
};
export default App;
