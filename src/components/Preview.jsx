import { useEffect, useRef, useState } from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import MaximizeIcon from '@mui/icons-material/Maximize';
import MinimizeIcon from '@mui/icons-material/Minimize';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import { Inspector } from 'react-dev-inspector';

function Preview({ webContainerInstance, isInitializedServer, setIsInitializedServer, url, setUrl, tempUrl, setTempUrl }) {
 const [basePath,setBasePath]=useState('/');
 const [isMaximized, setIsMaximized] = useState(false);
 const [isInspectMode, setIsInspectMode] = useState(false);
 const [isLoading,setIsLoading]=useState(false);

  const typingTimeoutRef = useRef(null);
  let devProcessRef = null;

  // useEffect(() => {
  

  //   async function main() {
  //     console.log("main function called", isInitializedServer);
  //     if (isInitializedServer) return;

  //     // Kill any existing dev process before starting a new one
  //     // if (devProcessRef) {
  //     //   try {
  //     //     await webContainerInstance.kill(devProcessRef.pid);
  //     //     console.log('Killed previous dev process');
  //     //   } catch (err) {
  //     //     console.error('Failed to kill previous process:', err);
  //     //   }
  //     // }

  //     const installProcess = await webContainerInstance.spawn('npm', ['i', '--force']);
  //     installProcess.output.pipeTo(new WritableStream({
  //       write(data) {
  //         console.log('Installation:', data);
  //       }
  //     }));
  //     let installExitCode = await installProcess.exit;

  //     if (installExitCode !== 0) {
  //       console.error('Installation failed, retrying with --legacy-peer-deps');
  //       const retryInstallProcess = await webContainerInstance.spawn('npm', ['i', '--legacy-peer-deps']);
  //       retryInstallProcess.output.pipeTo(new WritableStream({
  //         write(data) {
  //           console.log('Retry Installation:', data);
  //         }
  //       }));
  //       installExitCode = await retryInstallProcess.exit;

  //       if (installExitCode !== 0) {
  //         console.error('Retry installation failed');
  //         return;
  //       }
  //     }

  //     const devProcess = await webContainerInstance.spawn('npm', ['run', 'dev']);
  //     // Store reference to the current dev process
  //     devProcess.output.pipeTo(new WritableStream({
  //       write(data) {
  //         console.log('Dev server output:', data);
  //       }
  //     }));
  //     devProcessRef = devProcess;
  //     // devProcessRef = devProcess;
      
  //     // devProcess.output.pipeTo(new WritableStream({
  //     //   write(data) {
  //     //     console.log('Dev server output:', data);
  //     //   }
  //     // }));
      
  //     // Monitor for dev process exit
  //     // devProcess.exit.then(code => {
  //     //   console.log(`Dev server exited with code ${code}`);
  //     //   if (code !== 0 && isInitializedServer) {
  //     //     setIsInitializedServer(false);
  //     //     setUrl('');
  //     //     devProcessRef = null;
  //     //   }
  //     // });

  //     setIsInitializedServer(true);

  //     const handleServerReady = (port, url) => {
  //       console.log('Server ready URL:', url, port);
  //       setUrl(url);
  //       setTempUrl(url);

  //     };

  //     webContainerInstance.on('server-ready', handleServerReady);
  //   }

  //   if (webContainerInstance) {
  //     main();
  //   }

  //   // Cleanup function to kill processes when unmounting
  //   // return () => {
  //   //   if (webContainerInstance && devProcessRef) {
  //   //     try {
  //   //       webContainerInstance.kill(devProcessRef.pid);
  //   //       console.log('Cleaned up dev process on unmount');
  //   //     } catch (err) {
  //   //       console.error('Error killing process on unmount:', err);
  //   //     }
  //   //   }
      
  //   //   if (webContainerInstance && webContainerInstance.off) {
  //   //     webContainerInstance.off('server-ready');
  //   //   }
  //   // };

  // }, [webContainerInstance, isInitializedServer]);

  // useEffect(() => {
  //   if (isInitializedServer && !url) {
  //     const handleServerReady = (port, url) => {
  //       console.log("this is calling 2");
  //       setUrl(url);
  //     };

  //     webContainerInstance.on('server-ready', handleServerReady);

  //     // Cleanup function to remove event listeners
  //     return () => {
  //       // If there's no 'off' method, ensure listeners are not added multiple times
  //       // You might need to check if the API provides another way to remove listeners
  //     };
  //   }
  // }, [isInitializedServer, url, webContainerInstance, setUrl]);

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
           <button onClick={toggleMaximize} style={{ marginLeft: '10px', marginRight: '10px' }}>
 <AspectRatioIcon style={{ color: 'grey' }} /> 
          </button>
          {/* <button onClick={() => setIsInspectMode(!isInspectMode)} style={{ marginLeft: '10px', marginRight: '10px' }}>
            {isInspectMode ? 'Disable Inspect' : 'Enable Inspect'}
          </button> */}
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