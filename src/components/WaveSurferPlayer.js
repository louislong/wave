import React, {useState, useRef, useEffect, useCallback} from 'react';

import useWavesurfer from '../hooks/useWavesurfer';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const secondsRemainder = Math.round(seconds) % 60
  const paddedSeconds = `0${secondsRemainder}`.slice(-2)
  return `${minutes}:${paddedSeconds}`
}

// Create a React component that will render wavesurfer.
// Props are wavesurfer options.
const WaveSurferPlayer = (props) => {
  const containerRef = useRef()
  const spectrogramRef = useRef()
  const activeRegionRef = useRef()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState()

  const wavesurfer = useWavesurfer(containerRef, spectrogramRef, props)

  // On play button click
  const onPlayClick = useCallback(() => {
    console.warn('--------init waversurfer ---------', wavesurfer?.media)
    isPlaying ? wavesurfer.pause() : wavesurfer.play()
    // wavesurfer?.media.play()
    // wavesurfer.playPause()
  }, [wavesurfer, isPlaying])

  // Loop a region on click
  const loop = true
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

    const subscriptions = [
      wavesurfer.on('play', () => {
        console.warn('play wavesurfer')
        setIsPlaying(true)
      }),
      wavesurfer.on('pause', () => {
        console.warn('pause wavesurfer')
        setIsPlaying(false)
      } ),
      // Create some regions at specific time ranges
      // Track the time
      wavesurfer.on('timeupdate', (currentTime) => {
        setCurrentTime(currentTime)
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
      wavesurfer.on('decode', (duration) => {
        // set duration time
        console.warn('decode wavesurfer')
        setDuration(formatTime(duration))
        // setCurrentTime(0)
        // setIsPlaying(false)
        wsRegions.addRegion({
          start: 2,
          end: 4,
          content: 'Region',
          resize: false,
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
  }, [wavesurfer, loop, wsRegions])

  return (
    <>
      <div ref={containerRef} style={{ minHeight: '120px', paddingInline: '100px' }} />
      <div ref={spectrogramRef} style={{margin: '10px auto', position: 'relative', paddingInline: '100px'}} />
      <button onClick={onPlayClick} style={{ marginTop: '1em' }}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <text>{duration}</text>
      {
        props.wavUrl && 
        <>
          <a href={props.wavUrl} download={'recording.wav'}>Download audio</a>
          <button onClick={props.handleData} style={{ marginTop: '1em' }}>
            {'Anaylze'}
          </button>
        </>
      }
      <p>Seconds played: {formatTime(currentTime)}</p>
    </>
  )
}

export default WaveSurferPlayer