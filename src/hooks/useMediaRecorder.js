import React, {useState, useRef, useEffect, useCallback} from 'react';

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
      if (event.data.size > 1) {
        onData && onData(event, audioChunks.current);
      }
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