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

function concatenateBlobs(blobs, type, callback) {
  var buffers = [];

  var index = 0;

  function readAsArrayBuffer() {
      if (!blobs[index]) {
          return concatenateBuffers();
      }
      var reader = new FileReader();
      reader.onload = function(event) {
          buffers.push(event.target.result);
          index++;
          readAsArrayBuffer();
      };
      reader.readAsArrayBuffer(blobs[index]);
  }

  readAsArrayBuffer();


  function audioLengthTo32Bit(n) {
      n = Math.floor(n);
      var b1 = n & 255;
      var b2 = (n >> 8) & 255;
      var b3 = (n >> 16) & 255;
      var b4 = (n >> 24) & 255;
   
      return [b1, b2, b3, b4];
  }
  function concatenateBuffers() {
      var byteLength = 0;
      buffers.forEach(function(buffer) {
          byteLength += buffer.byteLength;
      });

      var tmp = new Uint8Array(byteLength);
      var lastOffset = 0;
      var newData;
      buffers.forEach(function(buffer) {
          if (type==='audio/wav' && lastOffset >  0) newData = new Uint8Array(buffer, 44);
          else newData = new Uint8Array(buffer);
          tmp.set(newData, lastOffset);
          lastOffset += newData.length;
      });
      if (type==='audio/wav') {
          tmp.set(audioLengthTo32Bit(lastOffset - 8), 4);
          tmp.set(audioLengthTo32Bit(lastOffset - 44), 40); // update audio length in the header
      }
      var blob = new Blob([tmp.buffer], {
          type: type
      });
      callback && callback(blob, type);         
      
  }
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
    const _recorder = new MediaRecorder(stream, {
      // mimeType: 'audio/wav',
      audioBitsPerSecond: 128000, // 128kbps
    });
    console.warn('recording type ---------', recorder?.mimeType)
    
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