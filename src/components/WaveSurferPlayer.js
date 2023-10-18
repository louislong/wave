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
import CropIcon from '@mui/icons-material/Crop';
// import Typography from '@mui/material/Typography';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import useMediaQuery from '@mui/material/useMediaQuery';

import Button from '@mui/material/Button';
import { Container, Stack, formLabelClasses } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { Widget, addResponseMessage, addUserMessage, setQuickButtons } from 'react-chat-widget';
import 'react-chat-widget/lib/styles.css';

import useWavesurfer from '../hooks/useWavesurfer';

import '../index.css'

const formatTime = (seconds, isDecimal) => {
  let secondsRemainder, paddedSeconds
  const minutes = Math.floor(seconds / 60)

  if (isDecimal) {
    secondsRemainder = `${Math.floor(seconds) % 60}.${(seconds - Math.floor(seconds)).toFixed(2).slice(-2)}`
    if (secondsRemainder > 9.99) {
      paddedSeconds = secondsRemainder
    } else {
      paddedSeconds = `0${secondsRemainder}`
    }
  } else {
    secondsRemainder = Math.round(seconds) % 60
    paddedSeconds = `0${secondsRemainder}`.slice(-2)
  }
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
  const [chatWindowOpen, setChatWindowOpen] = useState(false);

  const handleToggle = () => {
    setChatWindowOpen(!chatWindowOpen);
  };

  const wavesurfer = useWavesurfer(containerRef, spectrogramRef, props)
  const { wsRegions } = props

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));  // screen width < 600
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg')); // screen width > 1200

  useEffect(() => {
    addResponseMessage("Welcome to Stethy!");
    const buttons = [{label: 'My Heart Condition', value: 'My Heart Condition'}, {label: 'My Heart Rate', value: 'My Heart Rate'}];
    setQuickButtons(buttons)
  }, []);

  const handleNewUserMessage = (newMessage) => {
    console.log(`New message incoming! ${newMessage}`);
    // Now send the message throught the backend API
    const result = props.anaylzeResult
    if (newMessage.includes('heart condition')) {
      if (result?.includes('Abnormal Heart')) {
        addResponseMessage('Doc has estimated your Heart Condition to be abnormal')
      } else if (result?.includes('Normal Heart')) {
        addResponseMessage('Doc has estimated your Heart Condition to be normal')
      } else if (result?.includes('Cannot be determined')) {
        addResponseMessage('Your doctor could not estimate your heart condition due to poor signal quality')
      } else {
        addResponseMessage("While evaluating there could be a sign: Waiting for doctor's evaluation & response")
      }
    } else if (newMessage.includes('heart rate')) {
      const resultArray = result?.split(',')
      if (resultArray) {
        addResponseMessage(`Doc evaluated your heart rate to be ${resultArray[1]} bpm`)
      } else {
        addResponseMessage("While evaluating there could be a sign: Waiting for doctor's evaluation & response")
      }
    } else {
      addResponseMessage("While evaluating there could be a sign: Waiting for doctor's evaluation & response")
    }
  };

  const handleQuickButtonClicked = (buttonValue) => {
    console.warn('button vlaue', buttonValue)
    const result = props.anaylzeResult
    addUserMessage(buttonValue)
    if (buttonValue === 'My Heart Condition') {
      if (result?.includes('Abnormal Heart')) {
        addResponseMessage('Doc has estimated your Heart Condition to be abnormal')
      } else if (result?.includes('Normal Heart')) {
        addResponseMessage('Doc has estimated your Heart Condition to be normal')
      } else if (result?.includes('Cannot be determined')) {
        addResponseMessage('Your doctor could not estimate your heart condition due to poor signal quality')
      } else {
        addResponseMessage("While evaluating there could be a sign: Waiting for doctor's evaluation & response")
      }
    } else if (buttonValue === 'My Heart Rate') {
      const resultArray = result?.split(',')
      if (resultArray) {
        addResponseMessage(`Doc evaluated your heart rate to be ${resultArray[1]} bpm`)
      } else {
        addResponseMessage("While evaluating there could be a sign: Waiting for doctor's evaluation & response")
      }
    } else {
      addResponseMessage("While evaluating there could be a sign: Waiting for doctor's evaluation & response")
    }
  }

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

  const handleEdit = useCallback(() => {
    wsRegions.clearRegions()
    wsRegions.addRegion({
      start: wavesurfer.getDuration() / 8,
      end: wavesurfer.getDuration() - (wavesurfer.getDuration() / 8),
      color: 'hsla(200, 50%, 70%, 0.3)',
    });
  }, [wsRegions, wavesurfer])

  const getAnalyzeResultComponent = (result) => {
    const resultArray = result?.split(',')
    if (resultArray) {
      if (result?.includes('Abnormal Heart')) {
        return (
          <Stack direction='row' justifyContent="center" spacing={{ xs: 1, sm: 2 }} sx={{paddingLeft: '1%', paddingTop: '20px'}}>
            <Chip icon={<MoodBadIcon />} label={resultArray[0]} color={'error'} variant="outlined" />
            <Chip label={` Heart Rate: ${resultArray[1]}`} color={'error'} variant="outlined" />
          </Stack>
        )
      } else if (result?.includes('Normal Heart')) {
        return (
          <Stack direction='row' justifyContent="center" spacing={{ xs: 1, sm: 2 }} sx={{paddingLeft: '1%', paddingTop: '20px'}}>
            <Chip icon={<MoodIcon />} label={resultArray[0]} color={'success'} variant="outlined" />
            <Chip label={` Heart Rate: ${resultArray[1]}`} color={'success'} variant="outlined" />
          </Stack>
          
        )
      } else if (result?.includes('Cannot be determined')) {
        return (
          <Stack direction='row' justifyContent="center" spacing={{ xs: 1, sm: 2 }} sx={{paddingLeft: '1%', paddingTop: '20px'}}>
            <Chip icon={<SentimentNeutralIcon />} label={resultArray[0]} color={'info'} variant="outlined" />
            <Chip label={` Heart Rate: ${resultArray[1]}`} color={'info'} variant="outlined" />
          </Stack>
        )
      } else {
        return <Chip label={result} color={'error'} variant="outlined" sx={{paddingLeft: '15px'}}/>
      }
    }
  }

  // Loop a region on click
  const loop = true

  wsRegions.on('region-clicked', (region, e) => {
    e.stopPropagation() // prevent triggering a click on the waveform
    activeRegionRef.current = region
    region.play()
    region.setOptions({ color: 'rgba(223, 223,112, 0.5)' })
  })

  wsRegions.on('region-double-clicked', (region, e) => {
    e.stopPropagation() // prevent triggering a click on the waveform
    activeRegionRef.current = null // exit region
    // isPlaying && wavesurfer.pause()
    console.warn('erer', e)
    // wavesurfer.pause()
    // region.stop()
    region.setOptions({ color: 'hsla(200, 50%, 70%, 0.3)' })
  })

  wsRegions.on('region-created', (region, e) => {
    console.log("entered method: region-created", region, e); 
    if(!region.hasDeleteButton) {
      let regionEl = region.element;
      console.warn('regionEL', regionEl.innerHTML)

      let deleteButton = regionEl.appendChild(document.createElement('deletebutton'));
    
      deleteButton.addEventListener('click', function(e) {
        e.stopPropagation();
        region && region.remove();
      });
      
      deleteButton.innerHTML = "✕";

      const deleteButtonStyle = {
        display: 'block',
        color: 'white',
        fontSize: '1.2em',
        marginRight: '10px',
        backgroundColor: 'red',
        float: 'right',
        padding: '2px',
        fontWeight: '800',
        paddingInline: '5px',
        boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
      }
      Object.assign(deleteButton.style, deleteButtonStyle)

      // for cut Button
      let cropButton = regionEl.appendChild(document.createElement('cropbutton'));
    
      cropButton.addEventListener('click', function(e) {
        e.stopPropagation();

        const start = region.start.toFixed(2);
        const end = region.end.toFixed(2);
        props.trimAudio(start, end, wavesurfer)
      });
      
      cropButton.innerHTML = "CROP";

      const cropButtonStyle = {
        display: 'block',
        color: 'white',
        fontSize: '1em',
        marginLeft: '10px',
        backgroundColor: '#4caf50',
        float: 'left',
        padding: '2px',
        boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
      }
      Object.assign(cropButton.style, cropButtonStyle)

      region.hasDeleteButton = true;    
    }
  })

  // Initialize wavesurfer when the container mounts
  // or any of the props change
  useEffect(() => {
    if (!wavesurfer) return

    const subscriptions = [
      wavesurfer.on("ready",() => {
        
      }),
      wavesurfer.on('play', () => {
        console.warn('play wavesurfer')
        setIsPlaying(true)
      }),
      wavesurfer.on('pause', () => {
        console.warn('pause wavesurfer')
        setIsPlaying(false)
      }),
      wavesurfer.on('redraw', () => {
        console.warn('redraw wavesurfer')
      }),
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

        // change css style
        const host = containerRef.current.querySelector('div')
        const cursor = host.shadowRoot.querySelector('.cursor')
        const time = getComputedStyle(document.documentElement).getPropertyValue('--cursor-current-time')
        document.documentElement.style.setProperty('--cursor-current-time', `'${formatTime(currentTime, false)}'`);
        // console.warn('sdfjaofj', formatTime(currentTime, true), currentTime)
      }),
      wavesurfer.on('decode', (duration) => {
        // set duration time
        console.warn('decode wavesurfer')
        setDuration(formatTime(duration))
        // setCurrentTime(0)
        // setIsPlaying(false)
        // wsRegions.addRegion({
        //   start: 2,
        //   end: 4,
        //   content: 'Region',
        //   resize: true,
        //   color: 'rgba(123,23,200, 0.5)',
        // })
        // wsRegions.addRegion({
        //   start: 5,
        //   content: 'Marker',
        //   color: 'green'
        // })
      }),
      wavesurfer.on('interaction', () => {
        activeRegionRef.current = null
      }),
    ]

    return () => {
      subscriptions.forEach((unsub) => unsub())
    }
  }, [wavesurfer, loop, wsRegions])

  return (
    <>
      <div id='waveform' ref={containerRef} style={{ minHeight: '120px', paddingInline: '1%'}} />
      {
        props.anaylzeImage &&
        <div style={{paddingInline: '16px'}}>
          <img alt='result2' style={{width: '100%'}} src={`https://stethy.pdi.lab126.a2z.com/images/${props.anaylzeImage}_c.png`} />
        </div>
      }
      <div ref={spectrogramRef} style={{margin: '10px auto', position: 'relative', paddingInline: '1%'}} />
      {
        props.wavUrl && 
        <Stack justifyContent="space-between" direction={{ xs: 'column', sm: 'row' }}>
          <Stack sx={{paddingInline: '1%', paddingTop: '10px'}} direction={'row'} spacing={{ xs: 1, sm: 2, md: 4 }}>
            <Button size={isLargeScreen ? 'medium' : 'small'} color="secondary" onClick={onPlayClick} variant="contained" endIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}>
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button size={isLargeScreen ? 'medium' : 'small'} color="secondary" variant="contained" endIcon={<DownloadIcon />}>
              <a style={{textDecoration: 'none', color: 'white'}} href={props.wavUrl} download={`${new Date().toISOString()} recording.wav`} >Download</a>
            </Button>
            <Button size={isLargeScreen ? 'medium' : 'small'} color="secondary" variant="contained" endIcon={<SendIcon />}>
              {'Share'}
            </Button>
            <Button size={isLargeScreen ? 'medium' : 'small'} color="secondary" variant="contained" onClick={handleEdit} endIcon={<CropIcon />}>
              {'Edit'}
            </Button>
            <LoadingButton size={isLargeScreen ? 'medium' : 'small'} loadingPosition="end" loading={props.isAnalyzing} onClick={props.analyzeData} color="secondary" variant="contained" endIcon={<TroubleshootIcon />}>
              {props.isAnalyzing ? 'Anaylzing' : 'Anaylze'}
            </LoadingButton>
          </Stack>
          <Stack sx={{paddingInline: '1%', paddingTop: '10px'}} direction={'row'} spacing={{ xs: 1, sm: 2, md: 4 }}>
            <Slider sx={{width: isMobile ? '100%' : '100px'}} onChange={handleChange} value={barHeight} min={.1} max={10} step={0.01} aria-label="Default" valueLabelDisplay="off" />
            <Button size={isLargeScreen ? 'medium' : 'small'} color="primary" variant="contained" endIcon={<PlaceIcon />}>
              {formatTime(currentTime)}
            </Button>
            <Button size={isLargeScreen ? 'medium' : 'small'} color="primary" variant="contained" endIcon={<AccessTimeIcon />}>
              {duration}
            </Button>
          </Stack>
        </Stack>
      }
      <div className="App">
        <Widget
          handleNewUserMessage={handleNewUserMessage}
          handleToggle={handleToggle}
          handleQuickButtonClicked={handleQuickButtonClicked}
          title="Stethy"
          subtitle="Stethy Demo"
          emojis={true}
          autofocus={false}
          resizable={true}
          showCloseButton={true}
        />
      </div>
      {
        props.anaylzeResult && getAnalyzeResultComponent(props.anaylzeResult)
      }
    </>
  )
}

export default WaveSurferPlayer