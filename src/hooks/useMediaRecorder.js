import {useState, useRef} from 'react';

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
  const chunckCounter = useRef(0); // this will contain the recorded chunks

  async function start(timeslices, _stream) {
    const stream = _stream || await getStream(true); // request stream using our custom hook
    audioChunks.current = [];
    chunckCounter.current = 0;
    const _recorder = new MediaRecorder(stream, {
      // mimeType: 'audio/wav',
      audioBitsPerSecond: 128000, // 128kbps
    });
    console.warn('recording type ---------', _recorder?.mimeType)
    
    // called every timeslices (ms)
    _recorder.addEventListener('dataavailable', (event) => {
      console.warn('new data', event.data)
      if (event.data.size > 0) {
        audioChunks.current.push(event.data);
      }
      if (event.data.size > 1) {
        chunckCounter.current++
        onData && onData(chunckCounter.current, audioChunks.current);
      }

      // stop it every 20 seconds
      if (chunckCounter.current > 84) {
        console.warn('the counter is exceeeeeeeeed')
        _recorder.stop();
        stream?.getTracks().forEach(track => track.stop());
      }
      setState(_recorder.state);
    });
    _recorder.addEventListener('stop', (event) => {
      console.warn('stopped', audioChunks)
      onStop && onStop(audioChunks.current, _recorder.mimeType);
      // concatenateBlobs(audioChunks.current, _recorder.mimeType, onStop)
      setState(_recorder.state);
    });
    setRecorder(_recorder);
    onStart && onStart(_recorder);
    _recorder.start(timeslices); // start recording with timeslices
    setState(_recorder.state);
  }

  async function stop() {
    if (recorder) {
      recorder.stop();
      (await getStream()).getTracks().forEach(track => track.stop());
    }
  }
  return { start, stop, state };
}