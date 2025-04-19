import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, gql, useLazyQuery, useSubscription } from '@apollo/client';
import FileExplorer from './FileExplorer';
import parseXMLContent from './xmlParser';
import { KeyboardArrowRight } from '@mui/icons-material';
import { KeyboardArrowLeft } from '@mui/icons-material';
import TerminalIcon from '@mui/icons-material/Terminal';
import Editor from "@monaco-editor/react";
import { WebContainer } from '@webcontainer/api';
import Preview from './Preview';
import { useWebContainer } from '../hooks/useWebContainer';
import {marked} from 'marked';
import { useMonaco } from "@monaco-editor/react";
import { X } from '@mui/icons-material';
import TerminalComponent from './Terminal';
import SplitPane from 'react-split-pane';
import Steps from './Steps';
import "./Steps.css"
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const GET_TEMPLATE = gql`
  query GetTemplate($prompt: String!,$apiKey: String) {
    template(prompt: $prompt,apiKey: $apiKey) {
      prompts
      uiPrompts
    }
  }
`;

const SUGGEST_CODE = gql`
  query SuggestCode($prompt: String!) {
    suggestCode(prompt: $prompt)
  }
`;



// Define subscription
const AI_RESPONSE_SUBSCRIPTION = gql`
  subscription AiResponse($prompt: String!, $sessionId: String!, $messages: [String!], $suggestions: String, $image: String, $apiKey: String) {
    aiResponse(prompt: $prompt, sessionId: $sessionId, messages: $messages, suggestions: $suggestions, image: $image, apiKey: $apiKey)
  }
`;

// Update the regex pattern to match both id and title attributes
const artifactStartRegex = /<boltArtifact\s+id="([^"]*)"\s+title="([^"]*)">/;
// Alternative pattern if attributes might be in different order
// const artifactStartRegex = /<boltArtifact\s+(?:id="([^"]*)"\s+title="([^"]*)")|(?:title="([^"]*)"\s+id="([^"]*)")/;

function Workspace() {
  const location = useLocation();
  const apiKey=localStorage.getItem('geminiApiKey');
  console.log("apiKey omg",apiKey)
  const [mainTitle,setMainTitle]=useState("");
  useEffect(()=>{
    console.log("mainTitle changed",mainTitle)
  },[mainTitle])
  const { prompt, sessionId,firstPageImage } = location.state || { prompt: '', sessionId: '123',firstPageImage:'' };
  const [isInitializedServer, setIsInitializedServer] = useState(false);
  const [url, setUrl] = useState(null);
  const [tempUrl,setTempUrl]=useState(null);
  useEffect(()=>{
    console.log("url channged",url)
  },[url])
  const [promptId,setPromptId]=useState(1);
  const navigate=useNavigate();
  // Add GraphQL query
  const { loading, error, data } = useQuery(GET_TEMPLATE, {
    variables: { prompt,apiKey },
    skip: !prompt // Skip the query if there's no prompt
  });

  useEffect(() => {
    if (error) {
      const statusCode = error.networkError?.statusCode;
  
      if (statusCode === 401) {
        localStorage.clear();
        navigate('/');
      } else {
        console.error("GraphQL error:", error);
      }
    }
  }, [error, navigate]);
  const [isLoadingApi,setIsLoadingApi]=useState(true);

  // Add lazy query hook
  const [getAIResponse, { data: aiResponse }] = useLazyQuery(SUGGEST_CODE);

  // Add lazy query hook for suggestions
  const [getSuggestions, { data: suggestionsData }] = useLazyQuery(SUGGEST_CODE);

  // Add state for messages
  const [messages, setMessages] = useState([]);
  const [userPromptsList,setUserPromptsList]=useState([prompt]);
  const [prompts, setPrompts] = useState([]);
  const [uiPrompts, setUiPrompts] = useState([]);

  // Add state for suggestions
  const [suggestions, setSuggestions] = useState(["hello"]);

  const [currentResponse, setCurrentResponse] = useState('');
  const [activePrompt, setActivePrompt] = useState(prompt);
  const [activeImage,setActiveImage]=useState(null);
  const [messageSent,setMessageSent] = useState(false);

  // Replace useState with useRef for XML buffer
  const xmlBufferRef = useRef('');

  // Replace useState with useRef for currentFilePath and currentFileContent
  const currentFilePathRef = useRef(null);
  const currentFileContentRef = useRef('');

  // Add a buffer to accumulate XML chunks
  const [isInsideArtifact, setIsInsideArtifact] = useState(false);

  // Add these new state variables where your other states are defined
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentArtifactTitle, setCurrentArtifactTitle] = useState('');
  const [stepCounter, setStepCounter] = useState(1);
  // const [pendingDescriptionId, setPendingDescriptionId] = useState(null);
  const pendingDescriptionId=useRef(null);

  // Use subscription to listen for AI responses
  const { error: subscriptionError } = useSubscription(AI_RESPONSE_SUBSCRIPTION, {
    variables: {
      prompt: messageSent ? activePrompt : '',
      sessionId: sessionId,
      messages: messageSent ? [] : messages,
      suggestions: '',
      image:messageSent?activeImage:firstPageImage,
      apiKey:apiKey
    },
    skip: (messageSent && !activePrompt)||!localStorage.getItem('token'),
    onData: ({ data }) => {
      if (data?.data?.aiResponse) {
        setIsLoadingApi(false);
        
     
        // console.log("sab khel hai",messageSent,activePrompt)
        // Accumulate the XML chunks using the ref
        xmlBufferRef.current += data.data.aiResponse;

        // Check if we're transitioning into a boltArtifact
        if (!isInsideArtifact) {
          // Look for artifact start
          const artifactMatch = artifactStartRegex.exec(xmlBufferRef.current);
          if (artifactMatch) {
            // Capture the text before the artifact as a description
            const artifactStartIndex = xmlBufferRef.current.indexOf('<boltArtifact');
            if (artifactStartIndex > 0) {
              // Add the text before artifact as a descriptive step
              const descriptionText = xmlBufferRef.current.substring(0, artifactStartIndex).trim();
              if (descriptionText) {
                setCurrentDescription(descriptionText);
                addStep({
                  id: stepCounter,
                  promptId: promptId,
                  name: descriptionText,
                  type: 'description',
                  status: 'completed',
                  content: descriptionText
                });
                setStepCounter(prev => prev + 1);
              }
            }
            
            // Capture the artifact id and title (title is in the second capture group)
            const title = artifactMatch[2];
            setCurrentArtifactTitle(title);
            
            // Add artifact title as a step
            addStep({
              id: stepCounter,
              promptId: promptId,
              name: title,
              title: title,
              type: 'title',
              status: 'in-progress'
            });
            setStepCounter(prev => prev + 1);
            
            setIsInsideArtifact(true);
            // Clear processed content up to the start of the artifact's content
            xmlBufferRef.current = xmlBufferRef.current.substring(xmlBufferRef.current.indexOf('>') + 1);
          }
        }

        

        // Process actions if inside a boltArtifact
        if (isInsideArtifact) {
          let match;
      

          // Check for the start of a new action
          if (!currentFilePathRef.current && (match = actionStartRegex.exec(xmlBufferRef.current)) !== null) {
            const [fullMatch, type, filePath] = match;
            const matchIndex = xmlBufferRef.current.indexOf(fullMatch);
            const contentAfterTag = xmlBufferRef.current.substring(matchIndex + fullMatch.length);
            
            // Check if the contentAfterTag already contains the closing tag
            if (contentAfterTag.includes('</boltAction>')) {
              // Process complete action(s) in this chunk
              processCompleteActions(xmlBufferRef.current);
            }  else {
                // Check for partial closing tags at the end of the content
                const partialClosingTagCheck = (str) => {
                  const possiblePartials = ['</boltAction', '</boltActio', '</boltActi', '</boltAct', '</boltAc', '</boltA', '</bolt', '</bol', '</bo', '</b', '</','<'];
                  for (const partial of possiblePartials) {
                    if (str.endsWith(partial)) {
                      console.log("partial",partial)
                      return partial;
                    }
                  }
                  return null;
                };
                
                const partialTag = partialClosingTagCheck(contentAfterTag);
                if (partialTag) {
                  console.log("partialTag inside",partialTag)
                  // Keep the partial closing tag in the buffer
                  const contentWithoutPartial = contentAfterTag.substring(0, contentAfterTag.length - partialTag.length);
                  currentFilePathRef.current = filePath;
                  currentFileContentRef.current = contentWithoutPartial;
                  xmlBufferRef.current = partialTag;
                  console.log("xmlBufferRef.current inside partial tag",xmlBufferRef.current) // Save the partial tag for next chunk
                } else {
                  // No partial closing tag, handle as before
                  currentFilePathRef.current = filePath;
                  currentFileContentRef.current = contentAfterTag;
                  console.log("Initial content after tag:", contentAfterTag, filePath);
                  xmlBufferRef.current = '';
                }
                
                addStep({
                  id: stepCounter,
                  promptId: promptId,
                  name: filePath,
                  type: 'createFile',
                  status: 'in-progress'
                });
                setStepCounter(prev => prev + 1);
                
                // Automatically open the file being modified
                handleFileSelect({
                  name: filePath.split('/').pop(),
                  path: filePath,
                  content: currentFileContentRef.current
                });
              }
          } else if (currentFilePathRef.current) {
            console.log("inside function")
            console.log(xmlBufferRef.current,"xmlBufferRef.current after inside function")
            // Check for the end of the current action
            if (xmlBufferRef.current.includes('</boltAction>')) {
              const endTagIndex = xmlBufferRef.current.indexOf('</boltAction>');
              const beforeEndTag = xmlBufferRef.current.substring(0, endTagIndex);
              const afterEndTag = xmlBufferRef.current.substring(endTagIndex + '</boltAction>'.length);
              // console.log("xml split",xmlBufferRef.current.split('</boltAction>'))
              currentFileContentRef.current += beforeEndTag;
              console.log("Final content before end tag:", beforeEndTag);
              console.log("Complete file content:", currentFilePathRef.current );
const currenttStep = steps.find(step => step.type == 'createFile' && step.name == currentFilePathRef.current);
console.log(currenttStep,"currenttStep");
let statusCompleteName=currentFilePathRef.current;
setSteps(prevSteps => {
  console.log("Updating step for:", currentFilePathRef.current);
  const updatedSteps = prevSteps.map(step => {
    if (step.type === 'createFile' && step.name === statusCompleteName) {
      console.log("Matching step found, updating status to completed:", step);
      return { ...step, status: 'completed' };
    }
    return step;
  });
  console.log("Steps after update:", updatedSteps);
  return updatedSteps;
});

              // Stream the content to the file
              updateFileContent(currentFilePathRef.current, currentFileContentRef.current);
              
              // Reset for the next action
              currentFilePathRef.current = null;
              currentFileContentRef.current = '';
              
              // Remove the processed end tag from the buffer
              xmlBufferRef.current = afterEndTag;
              console.log("xmlBufferRef.current after completion",xmlBufferRef.current)
            } else {
              // Check for partial closing tags at the end of the buffer
              const partialClosingTagCheck = (str) => {
                const possiblePartials = ['</boltAction', '</boltActio', '</boltAct', '</boltAc', '</boltA', '</bolt', '</bol', '</bo', '</b', '</','<'];
                for (const partial of possiblePartials) {
                  if (str.endsWith(partial)) {
                    console.log("partial closing tag in content chunk:", partial);
                    return partial;
                  }
                }
                return null;
              };
              
              const partialTag = partialClosingTagCheck(xmlBufferRef.current);
              if (partialTag) {
                // Keep the partial closing tag in the buffer
                const contentWithoutPartial = xmlBufferRef.current.substring(0, xmlBufferRef.current.length - partialTag.length);
                currentFileContentRef.current += contentWithoutPartial;
                updateFileContent(currentFilePathRef.current, currentFileContentRef.current);
                xmlBufferRef.current = partialTag; // Save the partial tag for next chunk
                console.log("Saved partial closing tag for next chunk:", partialTag);
              } else {
                // No partial closing tag, append the entire buffer
                currentFileContentRef.current += xmlBufferRef.current;
                updateFileContent(currentFilePathRef.current, currentFileContentRef.current);
                console.log("Accumulated content chunk:", xmlBufferRef.current);
                xmlBufferRef.current = ''; // Clear the buffer as it's been appended
              }
            }
          }

          // Check for the end of boltArtifact
          if (xmlBufferRef.current.includes('</boltArtifact>')) {
            console.log("end of artifact")
            setIsInitializedServer(true);
            // Mark the artifact title step as complete
         
            
            // Capture any text after the artifact
            const [_, afterArtifact] = xmlBufferRef.current.split('</boltArtifact>');
            if (afterArtifact && afterArtifact.trim()) {
              // Check if we're already accumulating a description
              if (pendingDescriptionId.current !== null) {
                // Append to existing description step
                setSteps(prevSteps => {
                  return prevSteps.map(step => {
                    if (step.id === pendingDescriptionId.current) {
                      return {
                        ...step,
                        name: step.name + afterArtifact.trim(),
                        content: step.content + afterArtifact.trim()
                      };
                    }
                    return step;
                  });
                });
              } else {
                console.log("first time",afterArtifact.trim())
                // Create a new description step
                const newStepId = stepCounter;
                addStep({
                  id: newStepId,
                  promptId: promptId,
                  name: afterArtifact.trim(),
                  type: 'description',
                  status: 'in-progress', // Mark as in-progress until we know it's complete
                  content: afterArtifact.trim()
                });
                setStepCounter(prev => prev + 1);
                pendingDescriptionId.current=newStepId; // Track this step for potential future updates
              }
            }
            
            setIsInsideArtifact(false);
            setCurrentArtifactTitle('');
            xmlBufferRef.current = ''; // Clear buffer after processing
          }
        }
      } 
    
      else if ( pendingDescriptionId.current !== null && xmlBufferRef.current.trim()) {
        // We're outside an artifact and have pending description text
        // This handles subsequent chunks of description text
        console.log("second time",xmlBufferRef.current.trim(),pendingDescriptionId.current)
        const changeid=pendingDescriptionId.current;
        const remText=  xmlBufferRef.current.trim();
        console.log(changeid,"changeid")
        setSteps(prevSteps => {
          return prevSteps.map(step => {
            if (step.id === changeid&&step.type==="description") {
              return {
                ...step,
                name: step.name + ' ' + remText,
                content: step.content + ' ' + remText
              };
            }
            return step;
          });
        });
        xmlBufferRef.current = ''; // Clear the buffer after appending
        if (data?.data?.aiResponse === null) {
          // When stream is complete, finalize the response
          setCurrentResponse('');
          setActivePrompt(null);
          pendingDescriptionId.current=null;
          xmlBufferRef.current='';
        setMessageSent(true);
        console.log("idhar chala mai udhar chala angad",messageSent,activePrompt)
        }
      }
      else if (data?.data?.aiResponse === null) {
        if(xmlBufferRef.current.trim()){
addStep({
  id: stepCounter,
  promptId: promptId,
  name: xmlBufferRef.current.trim(),
  type: 'description',
  status: 'completed',
  content: xmlBufferRef.current.trim()
});
        }
        // When stream is complete, finalize the response
        setCurrentResponse('');
        setActivePrompt(null);
        pendingDescriptionId.current=null;
        xmlBufferRef.current='';
      setMessageSent(true);
      console.log("idhar chala mai udhar chala",messageSent,activePrompt)
      }
      
    
    }
  });
  const { webcontainer, error: webcontainerError } = useWebContainer();
  const [isInitialized, setIsInitialized] = useState(false);

  // Update prompts and messages when data is received
  useEffect(() => {
    if (data?.template) {
      setPrompts(data.template.prompts);
      setUiPrompts(data.template.uiPrompts);
  
      let uiPromptsdecoded = parseXMLContent(data.template.uiPrompts[0]);
  
      // Transform the decoded files into the required structure
      const newFiles = {};
      const writeFilesToWebContainer = [];
  
      uiPromptsdecoded.forEach(file => {
        const pathParts = file.path.split('/');
        let current = newFiles;
  
        // Create nested folder structure
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (!current[part]) {
            current[part] = {
              type: 'folder',
              children: {}
            };
          }
          current = current[part].children;
        }
  
        // Add the file
        const fileName = pathParts[pathParts.length - 1];
        current[fileName] = {
          type: 'file',
          content: file.content
        };
  
        // Prepare to write file to WebContainer
        writeFilesToWebContainer.push({ path: file.path, content: file.content });
      });
  
      setFiles(newFiles);
  
      // Write each file into WebContainer FS
      const writeToWebContainer = async () => {
        if (webcontainer && isInitialized) {
          for (const file of writeFilesToWebContainer) {
            try {
              const folder = file.path.split('/').slice(0, -1).join('/');
              if (folder !== '') {
                await webcontainer.fs.mkdir(folder, { recursive: true });
              }
              await webcontainer.fs.writeFile(file.path, file.content);
              console.log(`✅ Wrote: ${file.path}`);
            } catch (err) {
              console.error(`❌ Failed to write: ${file.path}`, err);
            }
          }
        }
      };
  
      writeToWebContainer();
  
      // Set initial messages
      const newMessages = [
        data.template.prompts[0],
        data.template.uiPrompts[0],
        prompt + " if its frontend project give only .tsx extension otherwise give whatever you want"
      ];
      setMessages(newMessages);
  
      // Optional: Trigger AI response here if needed
    }
   
  }, [data, prompt, getAIResponse]);

  useEffect(() => {
    if (suggestionsData) {
      // const markdownContent = suggestionsData.suggestCode;
      // const htmlContent = marked(markdownContent);
      setSuggestions([suggestionsData.suggestCode]);
    }
  }, [suggestionsData]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [viewMode, setViewMode] = useState('code'); // 'code' or 'preview'
  const [steps, setSteps] = useState([
    {
      id: 1,
      promptId:1,
      name: 'Initialize project structure',
      type: 'createFile',
      status: 'completed'
    },
    {
      id: 2,
      promptId:1,
      name: 'Create basic HTML layout',
      type: 'createFile',
      status: 'completed'
    },
    {
      id: 3,
      promptId:1,
      name: 'Add styling',
      type: 'createFile',
      status: 'completed'
    }
  ]);
  const [files, setFiles] = useState({
    'src': {
      type: 'folder',
      children: {
        'index.html': { type: 'file', content: '<!-- HTML content -->' },
        'components': {
          type: 'folder',
          children: {
            'Header.jsx': { type: 'file', content: '// Header component' }
          }
        },
        // ... rest of the file structure
      }
    }
  });

  const handleFileSelect = ({ name, path, content }) => {
    setSelectedFile({ name, path, content });
    setViewMode("code");
  };
  useEffect(()=>{
    console.log(steps,"steps changed");
  },[steps])

  const updateFileContent = async (path, newContent) =>{
    console.log("path", path);
  
    setFiles(prevFiles => {
      const newFiles = JSON.parse(JSON.stringify(prevFiles));
      const pathParts = path.split('/');
  
      let current = newFiles;
  
      // Navigate to the parent folder, creating folders if they don't exist
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = { type: 'folder', children: {} };
        }
        current = current[part].children;
      }
  
      // Update the file content, creating the file if it doesn't exist
      const fileName = pathParts[pathParts.length - 1];
      if (!current[fileName]) {
        current[fileName] = { type: 'file', content: '' };
      }
      current[fileName].content = newContent;
  
      return newFiles;
    });
  
    // Update selectedFile state if this is the currently selected file
    if (selectedFile && selectedFile.path === path) {
      setSelectedFile(prevSelectedFile => ({
        ...prevSelectedFile,
        content: newContent
      }));
    }
    if (webcontainer && isInitialized) {
      try {
        // Create directory if needed
        const folder = path.split('/').slice(0, -1).join('/');
        if (folder !== '') {
          await webcontainer.fs.mkdir(folder, { recursive: true });
        }
  
        // Write the file
        await webcontainer.fs.writeFile(path, newContent);
        console.log(`File written successfully: ${path}`);
      } catch (error) {
        console.error('Failed to write file:', error);
      }
    }
  }

  // const updateFileContent = (path, newContent) => {
  //   console.log("path",path);
   
  //   setFiles(prevFiles => {
  //     const newFiles = JSON.parse(JSON.stringify(prevFiles));
  //     const pathParts = path.split('/');
     
  //     let current = newFiles;
      
  //     // Navigate to the parent folder
  //     for (let i = 0; i < pathParts.length - 1; i++) {
  //       current = current[pathParts[i]]?.children;
  //     }
     
  //     // Update the file content
  //     current[pathParts[pathParts.length - 1]].content = newContent;
  //     return newFiles;
  //   });
  // };

  const monaco = useMonaco();
  const editorRef = useRef(null);

  // State to cache suggestions
  const [cachedSuggestions, setCachedSuggestions] = useState([]);

  // Store the current cursor position using a ref
  const cursorPositionRef = useRef({ lineNumber: 1, column: 1 });

  // Add a ref to store the timeout ID
  const typingTimeoutRef = useRef(null);

  const convertFilesToWebContainerFormat = (filesObj) => {
    const result = {};
    
    function processNode(node, path = '') {
      const currentPath = path.replace(/^\/+/, ''); // Remove leading slashes but preserve case
      
      if (node.type === 'file') {
        // Get the parent directory path and filename with original case
        const pathParts = currentPath.split('/');
        const fileName = pathParts.pop();
        const dirPath = pathParts.join('/');
        
        // Create nested directory structure
        let current = result;
        if (dirPath) {
          dirPath.split('/').forEach(dir => {
            if (!current[dir]) {
              current[dir] = { directory: {} };
            }
            current = current[dir].directory;
          });
        }
        
        // Add the file with original case
        current[fileName] = {
          file: {
            contents: node.content
          }
        };
      } else if (node.type === 'folder' && node.children) {
        Object.entries(node.children).forEach(([childName, childNode]) => {
          const childPath = path ? `${path}/${childName}` : childName;
          processNode(childNode, childPath);
        });
      }
    }
    
    Object.entries(filesObj).forEach(([name, node]) => {
      processNode(node, name);
    });
    
    return result;
  };

  // Function to fetch suggestions using your existing GraphQL query
  const fetchSuggestions = (context, lineNumber) => {
    // console.log(`Fetching suggestions for line ${lineNumber} with context:`, context);
    getSuggestions({
      variables: {
        prompt: context,
      },                  
    }).then((response) => {
      if (response.data.suggestCode) {
        const markdownContent = response.data.suggestCode;
      const htmlContent = marked(markdownContent);
      console.log(htmlContent,"htmlContent"); 
        setCachedSuggestions((prev) => [...prev, htmlContent]);
      }
    });
  };

  // Handle editor changes
  const handleEditorChange = (value, event) => {
    setSuggestions([]);
    setSelectedFile({
      ...selectedFile,
      content: value,
    });
    updateFileContent(selectedFile.path, value);

    // Clear the previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set a new timeout
    typingTimeoutRef.current = setTimeout(() => {
      const { lineNumber, column } = cursorPositionRef.current;
      console.log(lineNumber, "lineNumber while calling");
      const lines = value.split('\n');
      
      // Get the 10 lines above and below the current line
      const startLine = Math.max(0, lineNumber - 11);
      const endLine = Math.min(lines.length, lineNumber + 10);
      const contextLines = lines.slice(startLine, endLine);

      // Insert the marker at the specific column
      const marker = '/* SUGGESTION_POINT */';
      const lineIndex = lineNumber - startLine - 1;
      const lineContent = contextLines[lineIndex];
      
      // Ensure the column index is within the bounds of the line content
      const adjustedColumn = column-1;
      console.log(adjustedColumn, "adjustedColumn while calling",lineIndex);
      // console.log(adjustedColumn, "adjustedColumn while calling");
      contextLines[lineIndex] = lineContent?.slice(0, adjustedColumn) + marker + lineContent?.slice(adjustedColumn);

      // Join the context lines into a single string
      const contextWithMarker = contextLines.join('\n');

      // Pass the context with the marker
      fetchSuggestions(contextWithMarker);
    
    }, 1000); // Adjust the delay as needed (e.g., 1000ms for 1 second)
  };

  useEffect(() => {
    if (!monaco || suggestions.length === 0) {
      // console.log("Monaco not available or suggestions are empty, skipping registration.");
      return;
    }
  
    // console.log("Monaco instance is available with suggestions:", suggestions);
  
    // Register the inline completion provider
    let provider = monaco.languages.registerInlineCompletionsProvider("javascript", {
      provideInlineCompletions: async (model, position) => {
        cursorPositionRef.current = position;

        console.log("Generating new suggestions at:", position, suggestions); // Log the latest suggestions
  
        return {
          items: suggestions.map((suggestion, index) => ({
            insertText: suggestion,
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            kind: monaco.languages.CompletionItemKind.Text,
            sortText: String(index),
          })),
          dispose: () => {},
        };
      },
      freeInlineCompletions: () => {},
    });
  
    // console.log("Provider registered with new suggestions:", suggestions);
  
    // Get the editor instance (instead of the model)
    const editor = monaco.editor.getEditors()[0]; 
    
    if (editor) {
      // console.log("editor instance");
      editor.onDidChangeCursorPosition((event) => {
        console.log(event.position,"jaduuu");
        cursorPositionRef.current = event.position;
      });
editor.addCommand(monaco.KeyCode.Tab, () => {
  console.log("tab pressed");
      const position = editor.getPosition();
      const model = editor.getModel();
      const lineContent = model.getLineContent(position.lineNumber);
      
      // Check if there is a suggestion available
      if (suggestions.length > 0) {
        const suggestion = suggestions[0]; // Use the first suggestion for simplicity
        
        // Insert the suggestion and move the cursor to the end
        const newPosition = {
          lineNumber: position.lineNumber,
          column: position.column + suggestion.length
        };
        // console.log(newPosition,"newPosition everybody");
        editor.executeEdits('', [{
          range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
          text: suggestion,
          forceMoveMarkers: true
        }]);
        editor.setPosition(newPosition);
        cursorPositionRef.current = newPosition;
        // console.log("completed----------------");
        setSuggestions([]);
      }
    });

      // console.log("Triggering inline suggestion refresh.");
      editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {}); // Manually trigger inline suggestions
    } else {
      console.log("Editor instance not found.");
    }
  
    // Dispose old provider when `suggestions` changes
    return () => {
      console.log("Disposing old provider.");
      provider.dispose();
    };
  }, [monaco, suggestions]);

  useEffect(()=>{
    if(monaco){
   
    
    const editor = monaco.editor.getEditors()[0];
    editor?.onDidChangeCursorPosition((event) => {
      cursorPositionRef.current = event.position;
    });
  
  }
  },[monaco])
  
  // Now it will refresh only when `suggestions` is populated
  // useEffect(()=>{
  //   console.log(cursorPositionRef.current,"cursorPosition++++++++++++++++++++++");
  // },[cursorPositionRef.current])
 

  // Split into two separate effects - one for initialization, one for file mounting
  useEffect(() => {
    if (webcontainer && !isInitialized) {
      // console.log("Initializing webcontainer");
      setIsInitialized(true);
      
      // Run npm install and start - only once
      // const setupContainer = async () => {
      //   try {
      //     // console.log('Starting npm install...');
      //     const installProcess = await webcontainer.spawn('npm', ['install']);
      //     const installExit = await installProcess.exit;
          
      //     if (installExit !== 0) {
      //       throw new Error('npm install failed');
      //     }

      //     // console.log('Starting npm run dev...');
      //     const startProcess = await webcontainer.spawn('npm', ['run', 'dev']);
      //     // startProcess.output.pipeTo(new WritableStream({
      //     //   write(data) {
      //     //     console.log('Server output:', data);
      //     //   }
      //     // }));
      //   } catch (error) {
      //     console.error('Container setup failed:', error);
      //   }
      // };

      // setupContainer();
    }
  }, [webcontainer]); // Only depend on webcontainer
const handleChange=async()=>{
  if (webcontainer && isInitialized && files) {
    //   console.log("Mounting updated files",files);
    //   const webContainerFiles = convertFilesToWebContainerFormat(files);
    //  await webcontainer.mount(webContainerFiles).then(() => {
    //     console.log('Files mounted successfully',webContainerFiles);
    //   });
    
// const watcher =  await webcontainer.fs.watch('/');

// watcher.on('change', async (path) => {
//   console.log(`📂 File changed: ${path} at ${new Date().toISOString()}`);
//   const fileContent = await webcontainer.fs.readFile(path);
//   console.log(`📝 Content: ${new TextDecoder().decode(fileContent)}`);
// });
      //  webcontainer.fs.watch(null);
    }
}
  // Separate effect for mounting files
  useEffect(() => {
    if (webcontainer && isInitialized && files) {
      console.log("handle change called")
      handleChange();
    //   console.log("Mounting updated files",files);
//       const webContainerFiles = convertFilesToWebContainerFormat(files);
//       webcontainer.mount(webContainerFiles).then(() => {
//         console.log('Files mounted successfully',webContainerFiles);
//       });
//       const processes = await webcontainerInstance.spawn('ps', ['aux']);
// processes.output.pipeTo(
//   new WritableStream({
//     write(data) {
//       console.log(`[WebContainer Processes]: ${data}`);
//     },
//   })
// );
// const watcher =  webcontainer.fs.watch('/');

// watcher.on('change', async (path) => {
//   console.log(`📂 File changed: ${path} at ${new Date().toISOString()}`);
//   const fileContent = await webcontainer.fs.readFile(path);
//   console.log(`📝 Content: ${new TextDecoder().decode(fileContent)}`);
// });
//       //  webcontainer.fs.watch(null);
    }
  }, [files, webcontainer, isInitialized]);

  // Function to handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    if (selectedFile) {
      const updatedContent = selectedFile.content + '\n' + suggestion;
      updateFileContent(selectedFile.path, updatedContent);
      setSelectedFile({
        ...selectedFile,
        content: updatedContent
      });
    }
  };

  // Example usage: Call this function when a line is selected
  const handleLineSelection = (line) => {
    console.log(line,"line");
    // fetchSuggestions(line);
  };

  // State to track the height of the terminal
  const [terminalHeight, setTerminalHeight] = useState(20); // Initial height in percentage

  // Ref to store the animation frame ID
  const animationFrameIdRef = useRef(null);

  // Function to handle the mouse down event for resizing
  const handleMouseDown = (e) => {
      e.preventDefault();
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  };

  // Function to handle the mouse move event for resizing
  const handleMouseMove = (e) => {
      if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = requestAnimationFrame(() => {
          const newHeight = Math.min(Math.max(10, terminalHeight + e.movementY / window.innerHeight * 100), 90);
          setTerminalHeight(newHeight);
      });
  };

  // Function to handle the mouse up event to stop resizing
  const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
      }
  };
  const actionStartRegex = /<boltAction type="([^"]*)" filePath="([^"]*)">/;
  const actionEndRegex = /<\/boltAction>/;
  // Function to process potentially multiple complete actions in a chunk
  function processCompleteActions(chunk) {
    let remainingChunk = chunk;
    let actionMatch;
    
    // Process as many complete actions as possible
    while ((actionMatch = actionStartRegex.exec(remainingChunk)) !== null) {
      const [fullMatch, type, filePath] = actionMatch;
      const startIndex = remainingChunk.indexOf(fullMatch);
      const contentStartIndex = startIndex + fullMatch.length;
      
      // Look for closing tag
      const closingTagIndex = remainingChunk.indexOf('</boltAction>', contentStartIndex);
      
      if (closingTagIndex !== -1) {
        // Extract file content
        const fileContent = remainingChunk.substring(contentStartIndex, closingTagIndex);
        
        // Update the file
        updateFileContent(filePath, fileContent.trim());
        console.log("Processed complete action for:", filePath);
        
        // Add a step for this file creation/modification
        addStep({
          id: stepCounter,
          promptId: promptId,
          name: `Creating ${filePath}`,
          type: 'file',
          filePath: filePath,
          status: 'completed'
        });
        setStepCounter(prev => prev + 1);
        
        // Automatically open the file that was just created/modified
        handleFileSelect({
          name: filePath.split('/').pop(),
          path: filePath,
          content: fileContent.trim()
        });
        
        // Update remaining chunk to everything after the closing tag
        remainingChunk = remainingChunk.substring(closingTagIndex + '</boltAction>'.length);
      } else {
        // If we found a start but no end, save state and break
        currentFilePathRef.current = filePath;
        currentFileContentRef.current = remainingChunk.substring(contentStartIndex);
        
        // Add a step for this file creation/modification (in progress)
        addStep({
          id: stepCounter,
          promptId: promptId,
          name: `Creating ${filePath}`,
          type: 'file',
          filePath: filePath,
          status: 'in-progress'
        });
        setStepCounter(prev => prev + 1);
        
        // Automatically open the file being modified
        handleFileSelect({
          name: filePath.split('/').pop(),
          path: filePath,
          content: currentFileContentRef.current
        });
        
        xmlBufferRef.current = '';
        break;
      }
    }
    
    // Store any remaining content that doesn't contain a complete action
    if (!currentFilePathRef.current && remainingChunk) {
      xmlBufferRef.current = remainingChunk;
    }
  }

  // Add this helper function to add steps
  const addStep = (step) => {
    setSteps(prevSteps => [...prevSteps, step]);
  };

  const exportProject = () => {
    const zip = new JSZip();

    const addFilesToZip = (files, zipFolder) => {
      Object.entries(files).forEach(([name, file]) => {
        if (file.type === 'file') {
          zipFolder.file(name, file.content);
        } else if (file.type === 'folder') {
          const folder = zipFolder.folder(name);
          addFilesToZip(file.children, folder);
        }
      });
    };

    // Start adding files to the zip, excluding node_modules and package-lock.json
    const filteredFiles = { ...files };
    delete filteredFiles['node_modules'];
    delete filteredFiles['package-lock.json'];

    addFilesToZip(filteredFiles, zip);

    zip.generateAsync({ type: 'blob' }).then((content) => {
      saveAs(content, 'project.zip');
    });
  };

  const [isCodePanelExpanded, setIsCodePanelExpanded] = useState(false);

  // Add this handler function
  const toggleCodePanel = () => {
    setIsCodePanelExpanded(!isCodePanelExpanded);
  };

  // Add this state to track window width
  const [isMobileView, setIsMobileView] = useState(false);

  // Add this useEffect to detect window size
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768); // Adjust breakpoint as needed
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
    <div class="_RayContainer_1ti3k_1" data-theme="dark" data-chat-started="true"><div class="_LightRay_1ti3k_23 _RayOne_1ti3k_28"></div><div class="_LightRay_1ti3k_23 _RayTwo_1ti3k_36"></div><div class="_LightRay_1ti3k_23 _RayThree_1ti3k_46"></div><div class="_LightRay_1ti3k_23 _RayFour_1ti3k_55"></div><div class="_LightRay_1ti3k_23 _RayFive_1ti3k_65"></div></div>
    <div className="w-[100vw] flex h-screen bg-black ">
      {/* Steps Panel */}
      <div className="w-[100%] h-[10%] flex items-center justify-center p-2 pl-5" style={{color:'white',fontSize:"10px"}}>
         <p className=" p-2  rounded-full flex items-center gap-2 text-center text-lg font-bold">{mainTitle}</p>
         </div>
      <div className="w-[48%] min-w-[400px] h-[90%] absolute bottom-0 left-0 p-2 bg-[transparent] overflow-y-hidden scrollbar-hide">
   
      <Steps steps={steps} setViewMode={setViewMode} getAIResponse={getAIResponse} files={files} setFiles={setFiles} setActivePrompt={setActivePrompt} setPromptId={setPromptId} userPromptsList={userPromptsList} setUserPromptsList={setUserPromptsList} activeImage={activeImage} setActiveImage={setActiveImage} 
      activePrompt={activePrompt} isLoadingApi={isLoadingApi} setIsLoadingApi={setIsLoadingApi} promptId={promptId} 
      mainTitle={mainTitle} setMainTitle={setMainTitle}
      />
      </div>
      <div 
        onClick={toggleCodePanel}
        className="cursor-pointer hover:bg-gray-700 rounded-full p-1 flex items-center justify-center transition-all duration-200"
        style={{
          position: "absolute",
          top: "50%",
          left: isCodePanelExpanded 
            ? "3vw" 
            : isMobileView 
              ? "98vw"  // Mobile view position
              : "48vw", // Desktop view position
          transform: "translate(-50%, -50%)",
          zIndex: "1000",
          backgroundColor: "#262626"
        }}
      >
        {isCodePanelExpanded ? (
          <KeyboardArrowRight style={{ color: "white", fontSize: "20px" }} />
        ) : (
          <KeyboardArrowLeft style={{ color: "white", fontSize: "20px" }} />
        )}
      </div>
      {/* Code/Preview Panel */}
      <div
       style={{
        borderRadius: '10px',
        width: isCodePanelExpanded ? 'calc(95% - 10px)' : 'calc(100% - 400px - 10px)',
        maxWidth: isCodePanelExpanded ? '95%' : '50%',
        marginRight: '10px',
        display: 'flex',
        flexShrink: 1,
      }}
      className="absolute right-0 bottom-0   h-[90%] flex flex-col overflow-y-auto bg-gray-800 border-[1px] border-gray-500 " >
      <SplitPane
            split="horizontal"
            minSize={90}
            defaultSize="85%"
            maxSize={-90}
            style={{height:"100%",position:"relative",maxHeight:'100%',minHeight:'0% !important'}}
            className="flex flex-col"
        >
          
<div className="w-[100%]  flex flex-col">
<div className="flex bg-[#262626] border-b-[1px] border-gray-500 min-h-[40px]  h-[10%] w-[100%] items-center justify-start" >
  <div className="flex flex-row w-[fit-content] bg-black  gap-2 px-1 items-center h-[80%] rounded-full ml-2 ">
          <button
          style={{fontSize:"10px",height:"80%",display:"flex",alignItems:"center"}}
            className={`px-4 py-0  rounded-full   ${
              viewMode === 'code' ? 'bg-[#262626] text-blue-500 font-bold' : 'bg-black text-white'
            }`}
            onClick={() => setViewMode('code')}
          >
            Code
          </button>
          <button
          style={{fontSize:"10px",height:"80%",display:"flex",alignItems:"center"}}
            className={`px-4 py-1  rounded-full ${
              viewMode === 'preview' ? 'bg-[#262626] text-blue-500' : 'bg-black text-white'
            }`}
            onClick={() => setViewMode('preview')}
          >
            Preview
          </button>
          <button
      style={{ fontSize: "10px", height: "80%", display: "flex", alignItems: "center" }}
      className={`px-4 py-1 rounded-full bg-black text-white`}
      onClick={exportProject}
    >
      Export Project
    </button>
          
        </div>
        </div>
  {/* files */}
  <div className="w-[100%] h-[90%] flex flex-row">
      <div className="w-[20%] bg-[#262626] p-2 px-0 overflow-y-hidden border-r-[1px] border-gray-500  scrollbar-hide">
      <h2 className="text-gray-400  text-[15px] text-start mb-2 pb-2 sticky top-0 bg-[#262626] border-b-[1px] border-gray-500 px-2">Files</h2>

        <FileExplorer 
          files={files} 
          setFiles={setFiles}
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
        />
      </div>
      <div className="w-[80%] flex flex-col  overflow-y-auto bg-[#262626]">
     
        {/* code */}
            <div className="flex-1 overflow-y-auto">
                {viewMode === 'code' ? (
                    selectedFile ? (
                        <>
                            <Editor
                                height="100%"
                                defaultLanguage="javascript"
                                theme="vs-dark"
                                value={selectedFile.content}
                                onChange={handleEditorChange}
                                onMount={(editor, monaco) => {
                                    editorRef.current = editor; // Store the editor instance
                                }}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabCompletion: 'on',
                                    quickSuggestionsDelay: 0,
                                    suggestOnTriggerCharacters: true,
                                    quickSuggestions: {
                                        other: 'inline',
                                        comments: true,
                                        strings: true,
                                    },
                                    
                                    autoClosingBrackets: 'always', // Enable auto-closing brackets
                                    autoClosingQuotes: 'always',   // Enable auto-closing quotes
                                    autoClosingPairs: [
                                        { open: '<', close: '>' },   // Enable auto-closing for HTML tags
                                    ],
                                }}
                            />
                        </>
                    ) : (
                        <p>Select a file to view its contents</p>
                    )
                ) : (
                    <Preview webContainerInstance={webcontainer} isInitializedServer={isInitializedServer} setIsInitializedServer={setIsInitializedServer} url={url} setUrl={setUrl} tempUrl={tempUrl} setTempUrl={setTempUrl} />
                )}
            </div>
          
       
      </div>
      </div>
      </div>
      {/* terminal */}
      <div className="w-[100%]   p-0 pt-0 flex flex-col scrollbar-hide">
      <div className="w-[100%] h-[10%] flex items-center justify-start p-2 pl-5" style={{backgroundColor:"#171717",color:'white',fontSize:"10px"}}> <p className=" p-2  bg-[#262626] rounded-full flex items-center gap-2"><TerminalIcon style={{fontSize:"15px"}}/>Terminal</p></div>
                <TerminalComponent webcontainer={webcontainer} updateFileContent={updateFileContent} files={files} setFiles={setFiles} isInitializedServer={isInitializedServer} setIsInitializedServer={setIsInitializedServer} url={url} setUrl={setUrl} setViewMode={setViewMode}
                uiPrompts={uiPrompts}
                />
            </div>
            </SplitPane>
      </div>

      {/* Terminal Panel */}
  
    </div>
   
    </>
  );
}

export default Workspace; 