// src/components/Terminal.jsx
import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

const TerminalComponent = ({ webcontainer, updateFileContent, files, setFiles, isInitializedServer, setIsInitializedServer, url, setUrl,setViewMode,uiPrompts}) => {
  const terminalRef = useRef(null);
  const fitAddon = useRef(new FitAddon());
  const terminal = useRef(null);
  const commandBuffer = useRef("");
  const runCommandRef = useRef(null);

  // Effect for server initialization message
  useEffect(() => {
    if(isInitializedServer && terminal.current){
      terminal.current.write("\r\nServer is initialized\r\n$ ");
    }
  }, [isInitializedServer]);

  // Effect for running initial commands when isInitializedServer becomes true
  useEffect(() => {
    if (isInitializedServer && terminal.current && runCommandRef.current) {
      const initializeCommands = async () => {
        try {
          console.log("initializing commands starting");
          
          // Run npm install
          await runCommandRef.current("npm install");
          console.log("npm install completed");
          
          // Add a small delay before next command
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log("starting npm run dev");
          // Run npm run dev
          if(uiPrompts&&uiPrompts[0].includes("Hello Node.js")){
            await runCommandRef.current("npm run start");
          }
          else{
          await runCommandRef.current("npm run dev");
          }
          console.log("npm run dev completed");
          setViewMode("preview");
          
        } catch (error) {
          console.error("Error during command initialization:", error);
          terminal.current.writeln(`\r\nError during initialization: ${error.message}`);
          
          // If npm install succeeded but dev failed, try dev again
          if (error.message.includes("dev")) {
            try {
              console.log("Retrying npm run dev...");
              await new Promise(resolve => setTimeout(resolve, 2000));
              await runCommandRef.current("npm run dev");
            } catch (retryError) {
              console.error("Retry failed:", retryError);
              terminal.current.writeln(`\r\nRetry failed: ${retryError.message}`);
            }
          }
        }
      };

      // Wrap in setTimeout to ensure terminal is fully ready
      setTimeout(() => {
        initializeCommands().catch(error => {
          console.error("Fatal error during initialization:", error);
          terminal.current?.writeln(`\r\nFatal error: ${error.message}`);
        });
      }, 500);
    }
  }, [isInitializedServer]);

  // Main terminal initialization effect
  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize Terminal
    terminal.current = new Terminal({
      cursorBlink: true,
      theme: { background: "#1e1e1e", foreground: "#ffffff" },
      rows: 10,
      height: '50%'
    });

    terminal.current.loadAddon(fitAddon.current);
    terminal.current.open(terminalRef.current);
    fitAddon.current.fit();

    terminal.current.write("$ ");
    if (webcontainer) {
      webcontainer.on('server-ready', (port, url) => {
        console.log("Server is ready in terminal", url);
        // terminal.current.writeln(`\r\nServer is ready at: ${url}`);
        terminal.current.write("\r\n$ ");
        // setIsInitializedServer(true);
        setUrl(url);
      });
    }

    const runCommand = async (command) => {
      if (!webcontainer) {
        terminal.current.writeln("\r\nError: WebContainer not initialized");
        terminal.current.write("\r\n$ ");
        return;
      }
    
      try {
        console.log(`Executing: ${command}`);
        const [cmd, ...args] = command.split(" ");
        if (!webcontainer || !webcontainer.fs) {
          console.error("WebContainer is not initialized yet.");
          return;
        }
    
        if (cmd === "npm" &&args[1]&& (args[0] === "i" || args[0] === "install")) {
          // Step 1: Read package.json
          const packageJsonPath = "package.json";
          const packageJsonFile = await webcontainer.fs.readFile(packageJsonPath, "utf-8");
          const packageJson = JSON.parse(packageJsonFile);
          console.log(packageJson, "packageJson file");

          // Step 2: Extract package name
          const packageName = args[1];
          console.log(packageName,"packageName");
          if (packageName) {
            packageJson.dependencies = packageJson.dependencies || {};
            packageJson.dependencies[packageName] = "latest"; // Add package to dependencies
    
            // Step 3: Write updated package.json back to WebContainer
            try {
              await webcontainer.fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
              console.log("Successfully wrote to package.json");
              const packageJsonFile = await webcontainer.fs.readFile(packageJsonPath, "utf-8");
              updateFileContent(packageJsonPath, JSON.stringify(packageJson, null, 2));
              console.log(packageJsonFile,"packageJsonFile after writing",packageJsonPath);
            } catch (writeError) {
              console.error("Error writing to package.json:", writeError);
              terminal.current.writeln(`\r\nError writing to package.json: ${writeError.message}`);
            }
          }
        }
    
        // Run the actual command
        const process = await webcontainer.spawn(cmd, args);
        const outputStream = process.output.getReader();
    
        while (true) {
          const { value, done } = await outputStream.read();

          if (done) {
            console.log(`Command completed: ${command}`);
            break;
          }
          console.log("value",value);
          terminal.current.write(value);
          if (value) {
            console.log("value", value);
            // lastOutput = value;
            terminal.current.write(value);

            // Check for npm install completion indicators
            if (command.includes('npm install')) {
              if (value.includes('added') && value.includes('packages')) {
                console.log("npm install completed successfully");
                break;
              }
              // Additional checks for completion
              if (value.includes('up to date') || value.includes('packages are looking for funding')) {
                console.log("npm install completed (up to date)");
                break;
              }
            }

            // Check for npm run dev completion indicators
            if (command.includes('npm run dev')) {
              if (value.includes('Local:') || value.includes('ready in')) {
                console.log("npm run dev server started");
                setViewMode("preview");
                // break;
              }
            }
            if(command.includes('npm run start')){
              setViewMode('preview');
            }
          }
        }
    
        await process.exit;
        terminal.current.writeln("");
      } catch (error) {
        terminal.current.writeln(`\r\nExecution Error: ${error.message}`);
      }
    
      terminal.current.write("\r\n$ ");
    };

    // Store runCommand in ref so it can be accessed by other effects
    runCommandRef.current = runCommand;

    // Handle user input
    terminal.current.onData((data) => {
      const charCode = data.charCodeAt(0);

      if (charCode === 13) {
        // ENTER key
        terminal.current.write("\r\n");
        const command = commandBuffer.current.trim();
        if (command) {
          runCommand(command);
        } else {
          terminal.current.write("$ ");
        }
        commandBuffer.current = "";
      } else if (charCode === 127) {
        // BACKSPACE key
        if (commandBuffer.current.length > 0) {
          commandBuffer.current = commandBuffer.current.slice(0, -1);
          terminal.current.write("\b \b");
        }
      } else {
        // Normal character input
        commandBuffer.current += data;
        terminal.current.write(data);
      }
    });
   

    return () => {
      terminal.current.dispose();
    };
  }, [webcontainer]);

  return (
    <>
      <div ref={terminalRef} style={{ width: "100%" }} />
    </>
  );
};

export default TerminalComponent;
