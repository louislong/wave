import React, {useState, useRef, useEffect, useCallback} from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import DownloadIcon from '@mui/icons-material/Download';
import TroubleshootIcon from '@mui/icons-material/Troubleshoot';
import PlaceIcon from '@mui/icons-material/Place';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LoadingButton from '@mui/lab/LoadingButton';
import Slider from '@mui/material/Slider';
import Chip from '@mui/material/Chip';
import MoodIcon from '@mui/icons-material/Mood';
import MoodBadIcon from '@mui/icons-material/MoodBad';
import SendIcon from '@mui/icons-material/Send';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';

import Button from '@mui/material/Button';
import { Stack } from '@mui/material';

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
  const [barHeight, setBarHeight] = useState(3)

  const wavesurfer = useWavesurfer(containerRef, spectrogramRef, props)

  // On play button click
  const onPlayClick = useCallback(() => {
    console.warn('--------init waversurfer ---------', wavesurfer?.media)
    isPlaying ? wavesurfer.pause() : wavesurfer.play()
    // wavesurfer?.media.play()
    // wavesurfer.playPause()
  }, [wavesurfer, isPlaying])

  const handleChange = useCallback((event, newValue) => {
    setBarHeight(newValue);
    wavesurfer.setOptions({
      barHeight: newValue
    })
  }, [wavesurfer])

  const getAnalyzeResultComponent = (result) => {
    const resultArray = result?.split(',')
    if (resultArray) {
      if (result?.includes('Abnormal Heart')) {
        return (
          <Stack direction='row' spacing={{ xs: 1, sm: 2 }} sx={{paddingLeft: '1%', paddingTop: '1%'}}>
            <Chip icon={<MoodBadIcon />} label={resultArray[0]} color={'error'} variant="outlined" />
            <Chip label={` Heart Rate: ${resultArray[1]}`} color={'error'} variant="outlined" />
          </Stack>
        )
      } else if (result?.includes('Normal Heart')) {
        return (
          <Stack direction='row' spacing={{ xs: 1, sm: 2 }} sx={{paddingLeft: '1%', paddingTop: '1%'}}>
            <Chip icon={<MoodIcon />} label={resultArray[0]} color={'success'} variant="outlined" />
            <Chip label={` Heart Rate: ${resultArray[1]}`} color={'success'} variant="outlined" />
          </Stack>
          
        )
      } else if (result?.includes('Cannot be determined')) {
        return (
          <Stack direction='row' spacing={{ xs: 1, sm: 2 }} sx={{paddingLeft: '1%', paddingTop: '1%'}}>
            <Chip icon={<SentimentNeutralIcon />} label={resultArray[0]} color={'info'} variant="outlined" />
            <Chip label={` Heart Rate: ${resultArray[1]}`} color={'info'} variant="outlined" />
          </Stack>
        )
      } else {
        return <Chip label={result} color={'error'} variant="outlined" sx={{paddingLeft: '1%'}}/>
      }
    }
  }

  // Loop a region on click
  const loop = true
  const { wsRegions } = props

  wsRegions.on('region-clicked', (region, e) => {
    e.stopPropagation() // prevent triggering a click on the waveform
    activeRegionRef.current = region
    region.play()
    region.setOptions({ color: 'rgba(223, 223,112, 0.5)' })
  })

  wsRegions.on('region-dblclicked', (region, e) => {
    e.stopPropagation() // prevent triggering a click on the waveform
    activeRegionRef.current = region
    region.stop()
    region.setOptions({ color: 'rgba(123,23,200, 0.5)' })
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
          resize: true,
          color: 'rgba(123,23,200, 0.5)',
        })
        // wsRegions.addRegion({
        //   start: 5,
        //   content: 'Marker',
        //   color: 'green'
        // })
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
      <div ref={containerRef} style={{ minHeight: '120px', paddingInline: '1%',}} />
      <div ref={spectrogramRef} style={{margin: '10px auto', position: 'relative', paddingInline: '1%'}} />
      {
        props.wavUrl && 
        <Stack justifyContent="space-between" direction={{ xs: 'column', sm: 'row' }}>
          <Stack sx={{paddingLeft: '1%', paddingTop: '10px'}} direction={'row'} spacing={{ xs: 1, sm: 2, md: 4 }}>
            <Button color="secondary" onClick={onPlayClick} variant="contained" endIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}>
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button color="secondary" variant="contained" endIcon={<DownloadIcon />}>
              <a style={{textDecoration: 'none', color: 'white'}} href={props.wavUrl} download={'recording.wav'} >Download</a>
            </Button>
            <Button color="secondary" variant="contained" endIcon={<SendIcon />}>
              {'Share'}
            </Button>
            <LoadingButton loadingPosition="end" loading={props.isAnalyzing} onClick={props.handleData} color="secondary" variant="contained" endIcon={<TroubleshootIcon />}>
              {props.isAnalyzing ? 'Anaylzing' : 'Anaylze'}
            </LoadingButton>
          </Stack>
          <Stack sx={{paddingRight: '1%', paddingTop: '10px'}} direction={'row'} spacing={{ xs: 1, sm: 2, md: 4 }}>
            <Slider onChange={handleChange} value={barHeight} min={.1} max={10} step={0.01} aria-label="Default" valueLabelDisplay="off" />
            <Button color="primary" variant="contained" endIcon={<PlaceIcon />}>
              {formatTime(currentTime)}
            </Button>
            <Button color="primary" variant="contained" endIcon={<AccessTimeIcon />}>
              {duration}
            </Button>
          </Stack>
        </Stack>
      }
      {
        props.anaylzeResult && getAnalyzeResultComponent(props.anaylzeResult)
      }
    </>
  )
}

export default WaveSurferPlayer