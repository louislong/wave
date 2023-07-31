import React, { useState, useCallback, useRef} from 'react';
import './App.css';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";

import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { green, purple } from '@mui/material/colors';
import Typography from '@mui/material/Typography';

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
const DURATION = 20; // 20 seconds

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const secondsRemainder = Math.round(seconds) % 60
  const paddedSeconds = `0${secondsRemainder}`.slice(-2)
  return `${minutes}:${paddedSeconds}`
}

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
  // const [now, setNow] = useState(0)
  const now = useRef(0); // this will contain the recorded chunks
  const timer = useRef();

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
      const audioBlob = new Blob(audioChunks, { type });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl)
      const blob = await getPCM(true, audioBlob)
      setWavBlob(blob)
      const wavUrl = URL.createObjectURL(blob)
      setWavUrl(wavUrl)
    },
    onData: async (counter, audioChunks) => {
      // console.warn('counter', counter)
      const audioBlob = new Blob(audioChunks);
      setPcm(await getPCM(false, audioBlob, counter));
    },
  });


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

  const startRecording = useCallback(() => {
    start(TIME_SLICES)
    timer.current = setInterval(() => {
      now.current++
      if (now.current > 20) {
        clearInterval(timer.current)
        now.current = 0
      }
    }, 1000);

  }, [now, start])

  const stopRecording = useCallback(() => {
    stop()
    now.current = 0
    clearInterval(timer.current)
  }, [stop])

  return (
    <ThemeProvider theme={theme}>
       <Box sx={{ flexGrow: 1, backgroundColor: 'lightblue' }}>
        <Grid direction="column" justifyContent="center" alignItems="center" container spacing={2} sx={{ height: '100vh', width: '100vw', marginTop: 0}}>
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
                cursorColor='#fff'
                cursorWidth={1}
                url={audioUrl}
                wavUrl={wavUrl}
                minPxPerSec={1.5} /** Minimum pixels per second of audio (i.e. zoom level) */
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
              <IconButton disabled={isAnalyzing} onClick={() => startRecording()} >
                <KeyboardVoiceIcon sx={{ fontSize: 30, borderRadius: '100px', padding: '20px', backgroundColor: '#f03', color: 'white' }} />
              </IconButton> :
              <IconButton sx={{borderRadius: '35px', backgroundColor: 'rgba(0, 0, 0, 0.3)'}} onClick={() => stopRecording()}>
                <StopRoundedIcon sx={{ fontSize: 18, borderRadius: '90px', padding: '20px', backgroundColor: '#f03', color: 'white' }} />
                <Typography sx={{paddingLeft: '10px', paddingRight: '5px', color: 'white'}} variant="body1">{formatTime(now.current)}</Typography>
              </IconButton>
            }
          </Grid>
        </Grid>
        <Typography sx={{position: 'absolute', bottom: '2%', right: '5%'}} variant="body1">Disclaimer text</Typography>
      </Box>
    </ThemeProvider>
  );
};
export default App;
