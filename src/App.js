import React, {useState, useRef, useEffect, useCallback} from 'react';
import './App.css';
// import WaveSurfer from 'https://unpkg.com/wavesurfer.js@beta'
// import Minimap from 'https://unpkg.com/wavesurfer.js@beta/dist/plugins/minimap.js'
// import Timeline from 'https://unpkg.com/wavesurfer.js@beta/dist/plugins/timeline.js'
// import Spectrogram from 'https://unpkg.com/wavesurfer.js@beta/dist/plugins/spectrogram.js'
// import RegionsPlugin from 'https://unpkg.com/wavesurfer.js@beta/dist/plugins/regions.js'
import WaveSurfer from "wavesurfer.js";
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import SpectrogramPlugin from "wavesurfer.js/dist/plugins/spectrogram";
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';

// Create a Regions plugin instance
const wsRegions = RegionsPlugin.create();

function useUserMedia(constraints) {
  const [stream, setStream] = useState();
  function getStream(refresh = false) {
    if (stream && !refresh) {
      return stream;
    }
    return navigator.mediaDevices.getUserMedia(constraints).then((_stream) => {
      setStream(_stream);
      return _stream;
    });
  }
  return { stream, getStream };
}

export function useMediaRecorder({ onStart, onStop, onData }) {
  const [recorder, setRecorder] = useState();
  const [state, setState] = useState('inactive');
  const { getStream } = useUserMedia({ audio: true, video: false });
  const audioChunks = useRef([]); // this will contain the recorded chunks
  async function start(timeslices, _stream) {
    const stream = _stream || await getStream(true); // request stream using our custom hook
    audioChunks.current = [];
    const _recorder = new MediaRecorder(stream);
    onStart && onStart(_recorder);
    _recorder.start(timeslices); // start recording with timeslices
    setRecorder(_recorder);
    setState(_recorder.state);
    // called every timeslices (ms)
    _recorder.addEventListener('dataavailable', (event) => {
      console.warn('new data', event.data)
      audioChunks.current.push(event.data);
      onData && onData(event, audioChunks.current);
      setState(_recorder.state);
    });
    _recorder.addEventListener('stop', (event) => {
      console.warn('stopped', event.data)
      onStop && onStop(audioChunks.current);
      setState(_recorder.state);
    });
  }
  async function stop() {
    if (recorder) {
      recorder.stop();
      (await getStream()).getTracks().forEach(track => track.stop());
    }
  }
  return { start, stop, state };
}



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
      });
    };
    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(blob);
  });
}

export function Waveform({ pcm, playhead }) {
  const [canvasRef, setCanvasRef] = useState();

  useEffect(() => {
    if (pcm && canvasRef) {
      drawPCM(pcm, canvasRef, playhead); // TODO
    }
  }, [pcm, canvasRef, playhead]);

  function prettyCanvas(width, height, style) {
    return {
      width: width * 2,
      height: height * 2,
      style: { width, height, ...style },
    };
  }
  return <canvas ref={setCanvasRef} {...prettyCanvas(640, 200, { backgroundColor: '#BFBFBF' })} />;
}

function drawPCM(values, canvas, playhead) {
  const ctx = canvas.getContext('2d');
  let { width: clientWidth, height: clientHeight } = canvas;
  canvas.width = clientWidth;
  const scale = 2;
  ctx.scale(scale, scale);
  clientWidth /= scale; // scale down for pretty canvas
  clientHeight /= scale;
  const absoluteValues = true; // if false, we will retain the true waveform
  const valuesPerPixel = values.length / clientWidth;
  const blockSize = 1; // width of one sample block
  let max = 0;
  const averageValues = [];
  for (let x = 0; x < clientWidth; x += blockSize) {
    const area = values.slice(Math.floor(x * valuesPerPixel), Math.ceil((x + blockSize) * valuesPerPixel));
    const areaReducer = absoluteValues ? (sum, v) => sum + Math.abs(v) : (sum, v) => sum + v;
    const value = area.reduce(areaReducer, 0) / area.length;
    max = max < value ? value : max;
    averageValues.push(value);
  }
  averageValues.forEach((value, index) => {
    const height = (((value / max) * clientHeight) / 2) * 0.9;
    ctx.beginPath();
    ctx.strokeStyle = `#3535C3`;
    ctx.fillStyle = `#6464D8`;
    const args = [index * blockSize, clientHeight / 2 - (absoluteValues ? height / 2 : 0), blockSize, height];
    const borderRadius = Math.floor(Math.min(args[2], args[3]) / 2);
    ctx.fillRect(index * blockSize, clientHeight / 2 - (absoluteValues ? height / 2 : 0), blockSize, height);
    ctx.stroke();
  });
  if (playhead) {
    ctx.beginPath();
    const x = playhead * clientWidth;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, clientHeight);
    ctx.stroke();
  }
}



// WaveSurfer hook
const useWavesurfer = (containerRef, options) => {
  const [wavesurfer, setWavesurfer] = useState(null)

  // Initialize wavesurfer when the container mounts
  // or any of the props change
  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      ...options,
      container: containerRef.current,
    })

    ws.registerPlugin(
      SpectrogramPlugin.create({
        labels: true,
        height: 256,
      }),
    )

    setWavesurfer(ws)

    return () => {
      ws.destroy()
    }
  }, [options, containerRef])

  return wavesurfer
}

// Create a React component that will render wavesurfer.
// Props are wavesurfer options.
const WaveSurferPlayer = (props) => {
  const containerRef = useRef()
  const activeRegionRef = useRef()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const wavesurfer = useWavesurfer(containerRef, props)

  // On play button click
  const onPlayClick = useCallback(() => {
    wavesurfer.isPlaying() ? wavesurfer.pause() : wavesurfer.play()
  }, [wavesurfer])

  // Loop a region on click
  let loop = true

  wsRegions.on('region-clicked', (region, e) => {
    e.stopPropagation() // prevent triggering a click on the waveform
    activeRegionRef.current = region
    region.play()
    region.setOptions({ color: 'rgba(223, 223,112, 0.5)' })
  })

  // Initialize wavesurfer when the container mounts
  // or any of the props change
  useEffect(() => {
    if (!wavesurfer) return

    setCurrentTime(0)
    setIsPlaying(false)

    const subscriptions = [
      wavesurfer.on('play', () => setIsPlaying(true)),
      wavesurfer.on('pause', () => setIsPlaying(false)),
      wavesurfer.on('timeupdate', (currentTime) => setCurrentTime(currentTime)),
      // Create some regions at specific time ranges
      // Track the time
      wavesurfer.on('timeupdate', (currentTime) => {
        console.warn('timeupdate', currentTime)
        let activeRegion = activeRegionRef.current
        // When the end of the region is reached
        if (activeRegion && wavesurfer.isPlaying() && currentTime >= activeRegion.end) {
          if (loop) {
            // If looping, jump to the start of the region
            wavesurfer.setTime(activeRegion.start)
          } else {
            // Otherwise, exit the region
            activeRegion = null
          }
        }
      }),
      wavesurfer.on('decode', () => {
        wsRegions.addRegion({
          start: 4,
          end: 7,
          content: 'Blue',
          color: 'rgba(123,23,200, 0.5)',
        })
        wsRegions.addRegion({
          start: 5,
          content: 'Marker',
          color: 'green'
        })
      }),
      wavesurfer.on('interaction', () => {
        activeRegionRef.current = null
      })
    ]

    return () => {
      subscriptions.forEach((unsub) => unsub())
    }
  }, [wavesurfer])

  return (
    <>
      <div ref={containerRef} style={{ minHeight: '120px' }} />

      <button onClick={onPlayClick} style={{ marginTop: '1em' }}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <p>Seconds played: {currentTime}</p>
    </>
  )
}


const App = () => {
  const [pcm, setPcm] = useState();
  const [audioUrl, setAudioUrl] = useState();

  const { start, stop } = useMediaRecorder({
    // constraints: { audio: true, video: false }, // audio only
    onStart: () => {
      setPcm(undefined)
    },
    onStop: async (audioChunks) => {
      const audioBlob = new Blob(audioChunks);
      setPcm(await getPCM(audioBlob));
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
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
      <button onClick={() => start(500)}>record</button>
      <button onClick={() => stop()}>stop</button>
      {pcm && <Waveform pcm={pcm} />}
      <WaveSurferPlayer
        height={100}
        waveColor="rgb(200, 0, 200)"
        progressColor="rgb(100, 0, 100)"
        cursorColor='#57BAB6'
        cursorWidth={4}
        url={audioUrl}
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
    </>
  );
};
export default App;
