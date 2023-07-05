import React, {useState, useRef, useEffect, useCallback} from 'react';

import useWavesurfer from '../hooks/useWavesurfer';

// Create a React component that will render wavesurfer.
// Props are wavesurfer options.
export const WaveSurferPlayer = (props) => {
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
  const loop = false
  const { wsRegions } = props

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