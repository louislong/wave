import React, { useState, useCallback, useRef} from 'react';
import './App.css';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";

import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { green, purple } from '@mui/material/colors';
import Typography from '@mui/material/Typography';

// import Crunker from 'crunker'

import Box from '@mui/material/Box';
import { Grid } from '@mui/material';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Decoder from 'wavesurfer.js/dist/decoder'

import { useMediaRecorder } from './hooks/useMediaRecorder';
import { Waveform, WaveSurferPlayer } from './components';
import audioBufferToWav from './util/bufferToWav';
import logo from "./util/Logo_with_Tagline.png"

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

const theme = responsiveFontSizes(createTheme({
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
}));

const App = () => {
  const [pcm, setPcm] = useState();
  const [audioUrl, setAudioUrl] = useState();
  const [wavUrl, setWavUrl] = useState();
  const [wavFile, setWavFile] = useState();
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [anaylzeResult, setAnalyzeResult] = useState()
  const [anaylzeImage, setAnaylzeImage] = useState()
  // const [now, setNow] = useState(0)
  const now = useRef(0); // this will contain the recorded chunks
  const timer = useRef();

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg')); // screen width > 1200

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
      const file = new File([blob], 'test.wav')
      console.warn('filesdfsdfsdf', file)
      setWavFile(file)
      const wavUrl = URL.createObjectURL(blob)
      setWavUrl(wavUrl)
    },
    onData: async (counter, audioChunks) => {
      // console.warn('counter', counter)
      const audioBlob = new Blob(audioChunks);
      setPcm(await getPCM(false, audioBlob, counter));
    },
  });


  const analyzeData = useCallback((wavFile) => {
    const formData = new FormData();
    formData.append('file', wavFile);
    setAnalyzeResult(undefined)
    setAnaylzeImage(undefined)
    setIsAnalyzing(true)

    fetch('https://stethy.pdi.lab126.a2z.com/StethyAPI', {
    // fetch('http://3.135.20.213/StethyAPI', {
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
      setAnaylzeImage(wavFile.name.split('.')[0])
      console.log('Success:', result);
    })
    .catch((error) => {
      setIsAnalyzing(false)
      setAnalyzeResult(error)
      console.error('Error:', error);
    });
  }, [])

  const startRecording = useCallback(() => {
    setAnaylzeImage(undefined)
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

  const loadFile = event => {
    setAnaylzeImage(undefined)
    const file = event.target.files[0]
    console.warn('file', file)

    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    setWavUrl(url)
    setWavFile(file)
  }

  const trimAudio = (start, end, wavesurfer) => {
    if (wavesurfer.isPlaying) {
      console.warn('hesersdfsdfaof---------------------')
      wavesurfer.pause()
    }
    const originalBuffer = wavesurfer.decodedData;
    console.warn('region', start, end, originalBuffer)
    // console.log(end, start,end , start,originalBuffer, (end - start) * (originalBuffer.sampleRate * 1))
    // let emptySegment = Decoder.createBuffer(
    //   originalBuffer.getChannelData,
    //   //segment duration
    //   (end - start) * (originalBuffer.sampleRate * 1),
    //   // originalBuffer.sampleRate
    // );
    let segmentChanData = []
    
    for (let i = 0; i < originalBuffer.numberOfChannels; i++) {
        let chanData = originalBuffer.getChannelData(i);
        // let segmentChanData = emptySegment.getChannelData(i);
        for (let j = 0, len = chanData.length; j < end * originalBuffer.sampleRate; j++) {
            segmentChanData[j] = chanData[j + (start * originalBuffer.sampleRate)];
        }
    }
    const newBuffer = Decoder.createBuffer(segmentChanData, (end - start))
    const wav = audioBufferToWav(newBuffer)
    const blob = new window.Blob([ new DataView(wav) ], {
      type: 'audio/wav'
    })
    const wavUrl = URL.createObjectURL(blob)
    setAudioUrl(wavUrl)
    setWavUrl(wavUrl)
    const file = new File([blob], 'test.wav')
    setWavFile(file)
    // wavesurfer.load(wavUrl)
  }

  return (
    <ThemeProvider theme={theme}>
       <Box sx={{ flex: 1, backgroundColor: 'lightgray', flexWrap: 'wrap'}}>
        <Grid direction="column" alignItems="center" justifyContent={'center'} container spacing={2} sx={{width: '100vw', marginTop: 0}}>
          <Grid item sx={{ display: 'flex', alignItems: 'center', minHeight: '20vh'}} xs={1.5}>
            <img alt="logo" style={isLargeScreen ? {width: 406, height: 88} : {width: 304.5, height: 66}} src={logo} />
          </Grid>
          <Grid item sx={{ display: 'flex' }} xs={7} justifyContent="center" alignItems="center">
            <Container disableGutters sx={{width: '100vw', minHeight: '50vh'}}>
            {
              state === 'recording' && pcm && <Waveform pcm={pcm} />
            }
            {
              state !== 'recording' && !audioUrl && <div style={{minHeight: '50vh'}}/>
            }
            {
              state !== 'recording' && audioUrl &&
              <WaveSurferPlayer
                height={isLargeScreen ? 200 : 160}
                barHeight={3}
                waveColor="darkblue"
                progressColor="#e47911"
                cursorColor='#fff'
                cursorWidth={1}
                url={audioUrl}
                wavUrl={wavUrl}
                minPxPerSec={1.5} /** Minimum pixels per second of audio (i.e. zoom level) */
                wsRegions={wsRegions}
                interact={true}
                analyzeData={() => analyzeData(wavFile)}
                isAnalyzing={isAnalyzing}
                anaylzeImage={anaylzeImage}
                anaylzeResult={anaylzeResult}
                trimAudio={trimAudio}
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
          <Grid item xs={1} sx={{minHeight: '8vh', marginTop: '2vh' }}>
            {
              state === 'inactive' ?
              <IconButton disabled={isAnalyzing} onClick={() => startRecording()} >
                <KeyboardVoiceIcon sx={{ fontSize: isLargeScreen ? 30 : 25, borderRadius: '100px', padding: '20px', backgroundColor: '#e47911', color: 'white' }} />
              </IconButton> :
              <IconButton sx={{borderRadius: '35px', backgroundColor: 'rgba(0, 0, 0, 0.3)'}} onClick={() => stopRecording()}>
                <StopRoundedIcon sx={{ fontSize: 20, borderRadius: '90px', padding: '20px', backgroundColor: '#e47911', color: 'white' }} />
                <Typography sx={{paddingLeft: '10px', paddingRight: '5px', color: 'white'}} variant="body1">{formatTime(now.current)}</Typography>
              </IconButton>
            }
            <IconButton sx={{marginLeft: '5vw'}} variant="contained" component="label" disabled={isAnalyzing} >
              <input accept="audio/wav" onChange={loadFile} hidden type="file" />
              <FolderOpenIcon sx={{ fontSize: isLargeScreen ? 30 : 25, borderRadius: '100px', padding: '20px', backgroundColor: '#e47911', color: 'white', }} />
            </IconButton>
          </Grid>
          {
            anaylzeImage &&
            <div style={{paddingInline: '16px', paddingTop: '20px'}}>
              <img alt='result1' style={{width: '100%'}} src={`https://stethy.pdi.lab126.a2z.com/images/${anaylzeImage}.png`} />
            </div>
          }
          <Grid sx={{ display: 'flex', minHeight: '15vh' }} item xs={1.5}>
            <Container disableGutters sx={{width: '100vw', paddingInline: '3%', marginBottom: '10px'}}>
              <Typography variant={isLargeScreen ? 'body2' : 'caption'} sx={{textAlign: 'justify', }}>Disclaimer: Stethy's prototype presented here is for demonstration purposes only and should not be considered a medical device at this stage of development. Hence, it is not intended for diagnosis, treatment, or monitoring of medical conditions. For any health concerns or medical advice, please consult a qualified healthcare professional. No data from the stethoscope or any user inputs will be stored or collected. The data displayed on the screen is simulated and may or may not represent actual patient data. The prototype operates in a stateless manner, and any data generated will be automatically deleted right after the page is refreshed. Please be assured that your privacy is our priority and the creators assume no liability for the handling of data in third-party applications beyond this demo or for any misuse or reliance on the information provided.</Typography>
            </Container>
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
};
export default App;
