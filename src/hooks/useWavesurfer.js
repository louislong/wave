import {useState, useEffect} from 'react';

import WaveSurfer from "wavesurfer.js";
import SpectrogramPlugin from "wavesurfer.js/dist/plugins/spectrogram";
import colormap from "colormap";

const colors = colormap({
  colormap: 'cool',  // https://www.npmjs.com/package/colormap
  nshades: 256,
  format: 'float'
});

// WaveSurfer hook
const useWavesurfer = (containerRef, spectrogramRef, options) => {
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
        container: spectrogramRef.current,
        labels: true,
        height: 120,
        frequencyMin: 0,
        frequencyMax: 586,
        colorMap: colors,
      }),
    )

    setWavesurfer(ws)

    return () => {
      ws.destroy()
    }
  }, [options, containerRef, spectrogramRef])

  return wavesurfer
}

export default useWavesurfer
