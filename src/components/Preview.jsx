import { useEffect, useRef, useState } from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import MaximizeIcon from '@mui/icons-material/Maximize';
import MinimizeIcon from '@mui/icons-material/Minimize';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import { Inspector } from 'react-dev-inspector';
import HighlightAltIcon from '@mui/icons-material/HighlightAlt';
import { Tooltip } from '@mui/material';

function Preview({ webContainerInstance, isInitializedServer, setIsInitializedServer, url, setUrl, tempUrl, setTempUrl, clickedElement, setClickedElement }) {
 const [basePath,setBasePath]=useState('/');
 const [isMaximized, setIsMaximized] = useState(false);
 const [isInspectMode, setIsInspectMode] = useState(false);
 const [isLoading,setIsLoading]=useState(false);
 const iframeRef=useRef(null);
 const mouseMoveListenerRef = useRef(null);
 const [isInspectorMode, setIsInspectorMode] = useState(false);
 useEffect(() => {
  if (iframeRef.current && iframeRef.current.contentWindow) {
    iframeRef.current.contentWindow.postMessage({
      type: 'set-inspector-mode',
      enabled: isInspectorMode
    }, '*');
  }
}, [url,isInspectorMode]);

// Add this to your parent component's useEffect
useEffect(() => {
  const handleMessage = (event) => {
    if (event.data?.type === 'element-clicked') {
      // console.log('Element clicked in iframe:', event.data);
       setClickedElement(prev => {
      // Optional: prevent duplicates
      if (prev.some(el => el.outerHTML === event.data.outerHTML)) {
        return prev;
      }
      return [...prev, event.data];
    });
      // You can now access all the element properties:
      // event.data.tagName, event.data.className, etc.
    }
  };

  window.addEventListener('message', handleMessage);

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}, []);


  const typingTimeoutRef = useRef(null);
  let devProcessRef = null;

const toggleInspectorMode = () => {
  setIsInspectorMode(!isInspectorMode);
};
  const handleUrlChange = (event) => {
    const newBasePath = event.target.value;
    setBasePath(newBasePath);
    // setUrl(newBasePath);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      const newUrl = tempUrl + newBasePath;
      console.log("initialUrl", tempUrl, "newUrl", newUrl);
      setUrl(newUrl);
    }, 1000); // 1 second delay
  };

  const handleRefreshClick = async () => {
    if (webContainerInstance) {
      try {
        // Kill any existing dev process before starting a new one
        if (devProcessRef) {
          await webContainerInstance.kill(devProcessRef.pid);
          console.log('Killed previous dev process');
        }
        setIsLoading(true);
        const devProcess = await webContainerInstance.spawn('npm', ['run', 'dev']);
        if(webContainerInstance){
          webContainerInstance.on('server-ready', (port, url) => {
            setIsLoading(false);
            console.log("Server is ready in preview", url);
            setUrl(url);
          });
        }
        devProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log('Dev server output:', data);
          }
        }));

        // Store reference to the current dev process
        devProcessRef = devProcess;
      } catch (err) {
        console.error('Failed to spawn dev process:', err);
      }
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  
  return (
    <>
   
      <div
        style={{
          position: isMaximized ? 'fixed' : 'relative',
          top: isMaximized ? 0 : 'auto',
          left: isMaximized ? 0 : 'auto',
          width: isMaximized ? '100vw' : '100%',
          height: isMaximized ? '100vh' : '100%',
          zIndex: isMaximized ? 1000 : 'auto',
          backgroundColor: isMaximized ? '#262626' : 'transparent',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', marginTop: '10px' }}>
          <button onClick={handleRefreshClick} style={{ marginLeft: '10px', marginRight: '10px' }}>
            <RefreshIcon style={{ color: 'grey' }} />
          </button>
         
          <input
            type="text"
            value={basePath}
            onChange={handleUrlChange}
            placeholder="Enter URL"
            style={{ width: '80%', padding: '15px', borderRadius: '100px', height: '20px', background: 'black', color: '#A3A3A3' }}
          />
        <Tooltip title="Inspector" arrow>
  <button 
    onClick={toggleInspectorMode}
    style={{
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      margin: '0 5px'
    }}
  >
    {isInspectorMode ? (
      <HighlightAltIcon style={{ color: 'blue' }} />
    ) : (
      <HighlightAltIcon style={{ color: 'grey' }} />
    )}
  </button>
</Tooltip>
           <button onClick={toggleMaximize} style={{ marginLeft: '10px', marginRight: '10px' }}>
 <AspectRatioIcon style={{ color: 'grey' }} /> 
          </button>
         
        </div>
        <div style={{ width: '100%', height: 'calc(100% - 50px)' }}>
          {url&& !isLoading && (
            //  <Inspector   keys={['control', 'i']}
            //  active={isInspectMode}
            //            //  disableLaunchEditor={false}
            //             onClickElement={(element) => {
            //                 console.log('Selected element:', element);
            //                 setIsInspectMode(false);
            //             }} >
            <iframe
              src={url}
              ref={iframeRef}
              // onLoad={handleIframeLoad}
               allow="geolocation; cross-origin-isolated; screen-wake-lock; publickey-credentials-get; shared-storage-select-url; bluetooth; compute-pressure; usb; publickey-credentials-create; shared-storage; run-ad-auction; payment; autoplay; camera; private-state-token-issuance; accelerometer; idle-detection; private-aggregation; interest-cohort; local-fonts; midi; clipboard-read; gamepad; display-capture; keyboard-map; join-ad-interest-group; browsing-topics; encrypted-media; gyroscope; serial; unload; attribution-reporting; fullscreen; identity-credentials-get; private-state-token-redemption; hid; storage-access; sync-xhr; picture-in-picture; magnetometer; clipboard-write; microphone"
              style={{ width: '100%', height: '100%' }}
              // onLoad={handleIframeLoad}
            />

            // {/* </Inspector> */}
          )}
          {!url || isLoading && (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-500">Loading...</p>
            </div>
          )}
        </div>
      </div>
      </>
  );
}

export default Preview;