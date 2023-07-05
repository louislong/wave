import React, {useState, useRef, useEffect, useCallback} from 'react';
import './App.css';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";

import { useMediaRecorder } from './hooks/useMediaRecorder';
import { Waveform } from './components/Waveform';
import { WaveSurferPlayer } from './components/WaveSurferPlayer';


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

  const { start, stop } = useMediaRecorder({
    // constraints: { audio: true, video: false }, // audio only
    onStart: () => {
      setPcm(undefined)
      setAudioUrl(undefined)
    },
    onStop: async (audioChunks) => {
      const audioBlob = new Blob(audioChunks);
      setPcm(await getPCM(audioBlob));
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.controls = true
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
      <button onClick={() => start(200)}>record</button>
      <button onClick={() => stop()}>stop</button>
      {pcm && <Waveform pcm={pcm} />}
      <WaveSurferPlayer
        height={100}
        waveColor="rgb(200, 0, 200)"
        progressColor="rgb(100, 0, 100)"
        cursorColor='#57BAB6'
        cursorWidth={4}
        url={audioUrl}
        wsRegions={wsRegions}
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
