import React, { useEffect, useState, useRef } from 'react'
import sendIcon from '../assets/send.svg'; // Adjust the path as necessary
import './Steps.css';
import plusIcon from '../assets/Plus.svg';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { InsertDriveFileOutlined } from '@mui/icons-material';
import { Avatar, Skeleton } from '@mui/material';
import { useUser } from '../UserProvider';

function Steps({steps,setViewMode,getAIResponse,files,setActivePrompt,setPromptId,userPromptsList,setUserPromptsList,activeImage,setActiveImage,activePrompt,isLoadingApi,setIsLoadingApi,promptId,mainTitle,setMainTitle}) {
  const user = JSON.parse(localStorage.getItem('user'));
  const [prompt, setPrompt] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [draggedImage, setDraggedImage] = useState(null);
  const [imgBase64, setImgBase64] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [showFallbackAvatar, setShowFallbackAvatar] = useState(false);
  const [tempPrompt,setTempPrompt]=useState('');
  
  // Add a ref for the scroll container
  const scrollContainerRef = useRef(null);
useEffect(()=>{
  if(!isLoadingApi){
    setTempPrompt('');
  }
},[isLoadingApi]);
  // Add useEffect for auto-scrolling
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [steps, activePrompt, isLoadingApi]); // Scroll when these values change

  useEffect(() => {
    console.log(imgBase64,"imgBase64");
  }, [imgBase64]);


  const handleSubmit = () => {
    let fullPrompt
    setPromptId(prevPromptId => prevPromptId + 1);
    setUserPromptsList([...userPromptsList, prompt]);

    if(selectedFileName){
      fullPrompt = "fileName:"+selectedFileName+"\n"+fileContent + "\n"+prompt+"\n"+"and give me the code for perticular file only";
    }else{
      fullPrompt =prompt;
    }
  
    setActivePrompt(fullPrompt);
    setIsLoadingApi(true);
    setActiveImage(imgBase64);
    console.log(fullPrompt);
    setPrompt('');
    setFileContent('');
    setSelectedFileName('');
    setImgBase64('');
    setDraggedImage(null);
  };

  const handleFileSelect = (file) => {
    console.log("Selected file:", file);
    const content = fetchFileContent(file);
    setFileContent(content);
    setSelectedFileName(file);
    // setPrompt('');
    setShowFileSelector(false);
  };

  // Function to fetch file content (you need to implement this)
  const fetchFileContent = (filePath) => {
    console.log("Fetching file content for:", filePath);
    
    const findFileContent = (fileStructure, pathParts) => {
      if (pathParts.length === 0) return null;
      
      const [currentPart, ...remainingParts] = pathParts;
      const currentFile = fileStructure[currentPart];
      
      if (!currentFile) return null;
      
      if (remainingParts.length === 0) {
        return currentFile.content || "File content not found";
      }
      
      if (currentFile.type === 'folder') {
        return findFileContent(currentFile.children, remainingParts);
      }
      
      return null;
    };

    const pathParts = filePath.split('/');
    const fileContent = findFileContent(files, pathParts);
    
    // console.log("File content:", fileContent);
    return fileContent;
  };
  const handlePlusClick = () => {
    setFileList(generateFileList(files));
    setShowFileSelector(true);
  };

  const generateFileList = (fileStructure, path = '') => {
    let fileList = [];
    for (const [name, info] of Object.entries(fileStructure)) {
      const currentPath = path ? `${path}/${name}` : name;
      if (info.type === 'file') {
        fileList.push(currentPath);
      } else if (info.type === 'folder') {
        fileList = fileList.concat(generateFileList(info.children, currentPath));
      }
    }
    return fileList;
  };
  // console.log(steps,"steps everybody in the sheda");

  // Group steps by promptId
  const groupStepsByPromptId = (steps) => {
    const groups = {};
    
    steps.forEach(step => {
      if(step.type==="title"){
        if(!mainTitle){
          setMainTitle(step.title);
        }
      }
      const promptId = step.promptId || 'undefined'; // Handle steps without promptId
      if (!groups[promptId]) {
        groups[promptId] = [];
      }
      groups[promptId].push(step);
    });
    
    // Convert to array of objects sorted by promptId
    return Object.entries(groups)
      .map(([promptId, steps]) => ({
        promptId: promptId === 'undefined' ? null : parseInt(promptId),
        steps
      }))
      .sort((a, b) => {
        // Sort null promptIds first, then by promptId in ascending order
        if (a.promptId === null) return -1;
        if (b.promptId === null) return 1;
        return a.promptId - b.promptId;
      });
  };
  const handleTextareaChange = (e) => {
    const newValue = e.target.value;
    setPrompt(newValue);
    setTempPrompt(newValue);

    // Check if '@' was just typed
    const lastAtSymbolIndex = newValue.lastIndexOf('@');
    if (lastAtSymbolIndex !== -1) {
      // Extract text after the last @ symbol
      const textAfterAt = newValue.substring(lastAtSymbolIndex + 1);
      
      // Check if there's a space after the @ symbol
      if (textAfterAt.includes(' ')) {
        // Close file selector if there's a space
        setShowFileSelector(false);
      } else {
        // If we have an @ symbol without a space, show file selector
        if (!showFileSelector) {
          setFileList(generateFileList(files));
          setShowFileSelector(true);
        }
        
        // Set filter text
        setFilterText(textAfterAt);
      }
    } else if (showFileSelector) {
      // Close file selector if there's no @ symbol
      setShowFileSelector(false);
    }
    
    // Adjust height automatically
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Check if the file is an image
      if (file.type.match('image.*')) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          const fullBase64String = event.target.result;
          // Extract only the part after "base64,"
          const base64Data = fullBase64String.split('base64,')[1] || fullBase64String;
          setDraggedImage({
            name: file.name,
            data: fullBase64String
          });
          setImgBase64(base64Data);
        };
        
        reader.readAsDataURL(file);
      }
    }
  };
  
  const handlePaste = (e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    
    // Check if there are any items in the clipboard
    const items = clipboardData.items;
    if (!items) return;
    
    // Look for image content in clipboard items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        // Prevent the default paste behavior
        e.preventDefault();
        
        // Get the image as a file
        const file = items[i].getAsFile();
        if (!file) continue;
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const fullBase64String = event.target.result;
          // Extract only the part after "base64,"
          const base64Data = fullBase64String.split('base64,')[1] || fullBase64String;
          setDraggedImage({
            name: file.name || 'Pasted image',
            data: fullBase64String
          });
          setImgBase64(base64Data);
        };
        
        reader.readAsDataURL(file);
        break;
      }
    }
  };
  const handleKeyDown = (e) => {
    // Submit form when Enter is pressed without Shift key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default behavior (newline)
      if(prompt.trim() !== ''){
        handleSubmit();
      }
    }
  };

  return (
    <div className="flex flex-col bg-[transparent] h-[100%]  text-gray-400 uppercase relative  scrollbar-hide">
    {/* <h2 className="text-xl font-bold mb-4">Steps</h2> */}
    <div 
      ref={scrollContainerRef}
      className="space-y-2 text-xs p-2 h-[100%] w-[100%] ml-auto mr-auto  overflow-y-auto scrollbar-hide"
    >
      {groupStepsByPromptId(steps).map((group, groupIndex) => (
        <div key={`group-${group.promptId || groupIndex}`} className="mb-4">
          {group.promptId && (
            <div className='flex items-center gap-2 ml-[0px]'>
              {!showFallbackAvatar ? (
                <img
                  src={user?.picture}
                  alt={user?.name}
                  className="w-10 h-10 rounded-full cursor-pointer hover:opacity-90 transition-opacity"
                  // onClick={handleClick}
                  aria-controls={open ? 'user-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
                  onError={(e) => {
                    console.error('Image load error:', e);
                    setShowFallbackAvatar(true);
                  }}
                />
              ) : (
                <Avatar
                  // onClick={handleClick}
                  aria-controls={open ? 'user-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    bgcolor: '#2563eb', 
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.9
                    }
                  }}
                >
                  {user?.name?.charAt(0) || '?'}
                </Avatar>
              )}
              <div className='flex flex-col mb-2 gap-2 bg-[#262626] p-2 rounded-md w-[84%]'>
                
     <div className="flex items-center gap-2 p-2 rounded-md">
    <p className='text-xs text-white text-left capitalize'> {userPromptsList[group.promptId-1]}</p>
   </div>
   </div>
   </div>
          )}
          <div className="space-y-2 bg-[#262626] p-2 rounded-md w-[80%] ml-auto mr-auto">
            {group.steps.map((step,index) => (
              <div className='flex flex-col gap-2 bg-[#262626]  rounded-md w-[100%] capitalize mt-0 pt-0' style={{marginTop:"0px",paddingTop:"0px"}}>
               <div className='flex flex-col gap-2  bg-[#171717]  rounded-md  border-gray-700' >
               {step.type === "title" && (
                  <div className="flex items-center mt-2 gap-2 pl-4 p-4 bg-[#171717] border-b-[1px] border-gray-700">
                    <p className='text-lg text-white font-bold'>{step.title}</p>
                  </div>
                )}

                {(step.type === "createFile" || step.type === "file") && (
                  <div className="flex items-center pl-8  gap-2 p-2 bg-[#171717]">
                    <span className={`w-2 h-2 rounded-full ${
                      step.status === 'completed' ? 'bg-green-500' : 'bg-[transparent]'
                    }`}></span>
                    <p className='text-md text-white '> Update {step.name}</p>
                  </div>
                )}

                {step.type === "shell" && (
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      step.status === 'completed' ? 'bg-green-500' : 'bg-[transparent]'
                    }`}></span>
                    <p className='text-xs text-green-400 lowercase cursor-pointer'
                      onClick={() => {
                        if (step.content === "npm run dev") {
                          setViewMode("preview");
                        }
                      }}
                    >{step.content}</p>
                  </div>
                )}
                </div>

                {step.type === "description" && (
                  <div className="flex flex-col text-left gap-2 bg-[transparent] p-2 rounded-md">
                    {step.content.split('* ').map((item, index) => {
                      if (index === 0) {
                        return <p key={index} className='text-xs text-white'>{item}</p>;
                      }
                      
                      return (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-xs text-white mt-1.5">•</span>
                          <p className='text-xs text-white'>
                            {item.split('**').map((segment, idx) => (
                              idx % 2 === 1 ? 
                                <span key={idx} className="font-bold">{segment}</span> : 
                                <span key={idx}>{segment}</span>
                            ))}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        
        </div>
      ))}
        {activePrompt && (
          <div className='2'>
            {(promptId !== 1 &&isLoadingApi)&&(
                <div className='flex items-center gap-2 ml-[0px]'>
                 {!showFallbackAvatar ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-10 h-10 rounded-full cursor-pointer hover:opacity-90 transition-opacity"
                  // onClick={handleClick}
                  aria-controls={open ? 'user-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
                  onError={(e) => {
                    console.error('Image load error:', e);
                    setShowFallbackAvatar(true);
                  }}
                />
              ) : (
                <Avatar
                  // onClick={handleClick}
                  aria-controls={open ? 'user-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    bgcolor: '#2563eb', 
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.9
                    }
                  }}
                >
                  {user.name?.charAt(0) || '?'}
                </Avatar>
              )}
                 <div className='flex flex-col mb-2 gap-2 bg-[#262626] p-2 rounded-md w-[fit-content]'>
                   
        <div className="flex items-center gap-2 p-2 rounded-md">
       <p className='text-xs text-white text-left capitalize'>{tempPrompt}</p>
      </div>
      </div>
      </div>
            )}
            {isLoadingApi && (
           <Skeleton 
           variant="text" 
           sx={{ 
            marginLeft:'auto',
            marginRight:'auto',
             fontSize: '1rem',
             bgcolor: 'rgba(255, 255, 255, 0.36)', // Light gray color for dark theme
             width: '80%',
             height:'100px',

              // Set a specific width
             '&::after': {
               background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)'
             }
           }} 
         />
            )}
          </div>
        )}
    </div>
    {showFileSelector && (
        <div className="absolute z-10 max-h-[50%] bottom-[25%] left-6 w-[30%]  bg-[#171717] text-white p-4 overflow-auto text-xs scrollbar-hide rounded-md border-[1px] border-gray-700">
          <p className='text-[10px] text-gray-300 text-start capitalize mb-2'>Files</p>
          <ul>
            {fileList
              .filter(file => filterText ? file.toLowerCase().includes(filterText.toLowerCase()) : true)
              .map((file, index) => (
                <li key={index} onClick={() => handleFileSelect(file)} className="cursor-pointer mb-2 text-xs text-start lowercase flex items-center gap-2">
                 <InsertDriveFileOutlined style={{color:"grey",fontSize:"15px"}} /> {file}
                </li>
              ))}
          </ul>
        </div>
      )}
    {/* chat input */}
   


          <div className="relative bottom-0 w-[90%] m-auto  h-[40%] p-2 pt-0 relative rounded-lg border-[1px] border-gray-700 bg-[#141414] " >
    <svg class="_PromptEffectContainer_1nqq4_1"><defs><linearGradient id="line-gradient" x1="20%" y1="0%" x2="-14%" y2="10%" gradientUnits="userSpaceOnUse" gradientTransform="rotate(-45)"><stop offset="0%" stop-color="#1488fc" stop-opacity="0%"></stop><stop offset="40%" stop-color="#1488fc" stop-opacity="80%"></stop><stop offset="50%" stop-color="#1488fc" stop-opacity="80%"></stop><stop offset="100%" stop-color="#1488fc" stop-opacity="0%"></stop></linearGradient><linearGradient id="shine-gradient"><stop offset="0%" stop-color="white" stop-opacity="0%"></stop><stop offset="40%" stop-color="#8adaff" stop-opacity="80%"></stop><stop offset="50%" stop-color="#8adaff" stop-opacity="80%"></stop><stop offset="100%" stop-color="white" stop-opacity="0%"></stop></linearGradient></defs><rect class="_PromptEffectLine_1nqq4_10" pathLength="100" stroke-linecap="round"></rect><rect class="_PromptShine_1nqq4_22" x="48" y="24" width="70" height="1"></rect></svg>
    <div class="border-transparent" style={{height: "0px"}}><div class="overflow-hidden h-full border-bolt-elements-borderColor relative bg-bolt-elements-background-depth-2 transition-opacity duration-200 rounded-t-[0.44rem] border-b-px left-0 right-0 opacity-0"><div class="flex py-2.5 px-2.5 font-medium text-xs"><div class="flex justify-between items-center w-full"><div></div><button class="bg-transparent text-bolt-elements-link hover:underline">Clear</button></div></div></div></div>
    <div class="border-b-px border-transparent" style={{height: "0px"}}><div class="overflow-hidden h-full border-bolt-elements-borderColor relative bg-bolt-elements-background-depth-2 transition-opacity duration-200 rounded-t-[0.44rem] border-b-px left-0 right-0 opacity-0"><div class="flex text-xs py-1.5 px-2.5 font-medium"><div class="flex-grow"></div><button class="bg-transparent text-bolt-elements-link hover:underline">Update</button></div></div></div>
    {selectedFileName && (

<div className="relative w-[fit-content] left-2 top-2 text-[10px] text-white ml-2 mt-1 lowercase border-[1px] border-gray-100 rounded-md p-1">

  <InsertDriveFileIcon className="w-2 h-2" style={{color:"grey",fontSize:"15px"}} /> {selectedFileName}

  <CloseIcon

    className="w-2 h-2 cursor-pointer"

    style={{color:"white",fontSize:"15px", marginLeft: '5px'}}

    onClick={() => setSelectedFileName('')}

  />

</div>

)} 
   {draggedImage && (
          <div className="relative w-[fit-content] left-2 text-[10px] text-white ml-2 mt-4 lowercase border-[1px] border-gray-100 rounded-md p-1 flex items-center">
            <img 
              src={draggedImage.data} 
              alt={draggedImage.name} 
              className="w-6 h-6 mr-1 object-cover" 
            />
            {draggedImage.name}
            <CloseIcon
              className="w-2 h-2 cursor-pointer ml-1"
              style={{color:"white",fontSize:"15px"}}
              onClick={() => {
                setDraggedImage(null);
                setImgBase64('');
              }}
            />
          </div>
        )}
        <div className="relative">
        {isDraggingOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-70 rounded-md border-2 border-dashed border-blue-400 z-10">
              <div className="text-white text-center">
                <p className="text-lg font-semibold">Drop image here</p>
                <p className="text-sm">Release to upload</p>
              </div>
            </div>
          )}
          <textarea
              value={prompt}
              onChange={handleTextareaChange}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              className="w-full p-3 pr-20 border rounded-md mb-4 resize-none bg-transparent border-none focus:outline-none"
              style={{ minHeight: '70px', maxHeight: '200px', color: 'white' }}
              placeholder="Ask AI for code modification or drop an image here..."
          />
          
        
        </div>
        
        
     
<div className='flex items-center  absolute bottom-2 right-2 m-2 gap-1 '>

<button onClick={handlePlusClick} className=" bg-gray-700 text-white p-2 flex  rounded-full border border-gray-900">

<AddIcon style={{ color: "white", fontSize: "15px",margin:0 }} />  

</button>

<button onClick={handleSubmit} className=" flex bg-gray-700 text-white p-2 rounded-full border border-gray-900">

<SendIcon style={{ color: "white", fontSize: "15px",margin:0 }} />  

</button>

</div>
   

       
          </div>
  
        


  </div>
  )
}

export default Steps