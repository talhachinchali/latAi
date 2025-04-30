import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EastIcon from '@mui/icons-material/East';
import linkedInLogo from '../assets/linkedInLogo.png';
import { useMutation, useQuery } from '@apollo/client';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import CloseIcon from '@mui/icons-material/Close';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import logo from '../assets/onemorelogo.png';
import { Skeleton } from '@mui/material';
import Sidebar from './Sidebar';


function HomePage() {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const user = JSON.parse(localStorage.getItem('user'));
  const [googleImageUrl, setGoogleImageUrl] = useState(user?.picture || '');
  const [showFallbackAvatar, setShowFallbackAvatar] = useState(false);
  const [draggedImage, setDraggedImage] = useState(null);
  const [imgBase64, setImgBase64] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Gemini API key state and modal controls
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('geminiApiKey') || '');
  const [tempApiKey, setTempApiKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);


 

  // Modal handlers
  const handleOpenApiKeyModal = () => {
    setTempApiKey('');
    setIsEditing(false);
    setApiKeyModalOpen(true);
  };

  const handleCloseApiKeyModal = () => {
    setApiKeyModalOpen(false);
  };

  const handleApiKeySubmit = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem('geminiApiKey', tempApiKey);
      setGeminiApiKey(tempApiKey);
    }
    setIsEditing(false);
    setApiKeyModalOpen(false);
  };

  const handleEditApiKey = () => {
    setTempApiKey(geminiApiKey);
    setIsEditing(true);
  };

  const handleDeleteApiKey = () => {
    localStorage.removeItem('geminiApiKey');
    setGeminiApiKey('');
    setIsEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user) {
      window.confirm('Please login to continue');
      return;
    }
    if (prompt.trim()) {
      const sessionId = Math.random().toString(36).substring(2, 15) + 
      Math.random().toString(36).substring(2, 15);
      navigate('/workspace', { state: { prompt, sessionId,firstPageImage:imgBase64 } });
    }
  };

  const handleTextareaChange = (e) => {
    setPrompt(e.target.value);
    
    // Adjust height automatically
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };
  
  const handleKeyDown = (e) => {
    // Submit form when Enter is pressed without Shift key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default behavior (newline)
      handleSubmit(e);
    }
  };

  const handleGoogleLogin = () => {
    // Your Google OAuth client ID should be in environment variables
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=${scopes.join(' ')}` +
      `&access_type=offline`+
      `&prompt=select_account`;

    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    try {
      // const { data } = await logout();
      // console.log(data);
      // if (data?.logout) {
        // Clear local storage
        localStorage.clear();
        // Refresh the page or update UI state
        // window.location.reload();
      // }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleClick = (event) => {
    console.log(user);
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuLogout = () => {
    handleClose();
    handleLogout();
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

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.match('image.*')) {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const fullBase64String = event.target.result;
        const base64Data = fullBase64String.split('base64,')[1] || fullBase64String;
        setDraggedImage({
          name: file.name,
          data: fullBase64String
        });
        setImgBase64(base64Data);
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Function to get fresh Google profile data


  // Get user data to check if logged in

  return (
    <>
    <div className='w-screen p-5  bg-transparent absolute top-0 left-0 z-10 text-white flex justify-between items-center'>
      {/* <p className='text-xl  font-bold'>LatAi</p> */}
      <img src={logo} alt='logo' className='w-[100px]' />
      <div className='flex justify-between items-center'>
        <button 
          onClick={handleOpenApiKeyModal}
          className='mr-4 bg-transparent text-white px-4 py-1 rounded-md border border-gray-600 hover:bg-gray-800 transition-colors text-sm'
        >
          Gemini API
        </button>
        
        <a href='https://www.linkedin.com/in/talha-chinchali-148902254/' target='_blank'>
        <img src={linkedInLogo} alt='linkedInLogo'  className='bg-white w-5 h-5 '/>
        </a>
        {user ? (
          <div className="flex items-center gap-4 ml-4">
            <div className="relative">
              {!showFallbackAvatar ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-10 h-10 rounded-full cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={handleClick}
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
                  onClick={handleClick}
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
              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: {
                    backgroundColor: '#1e1e1e',
                    color: 'white',
                    mt: 1,
                    '& .MuiMenuItem-root': {
                      fontSize: '0.875rem',
                      '&:hover': {
                        backgroundColor: '#2e2e2e',
                      },
                    },
                  },
                }}
              >
                <MenuItem
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid #333',
                    py: 2,
                  }}
                >
                  <span className="font-medium">{user.name}</span>
                  <span className="text-sm text-gray-400">{user.email}</span>
                </MenuItem>
                <MenuItem onClick={handleMenuLogout}>
                  <span className="text-red-500">Logout</span>
                </MenuItem>
              </Menu>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleGoogleLogin} 
            className='ml-4 bg-white text-black px-4 py-1 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2'
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
              />
            </svg>
          <p className='text-black text-[10px]'> Login </p>
          </button>
        )}
      </div>
      
      </div>
      <div style={{width:'5%',backgroundColor:'transparent',height:'100vh',position:'absolute',left:0,top:0,zIndex:2}}
      onMouseEnter={()=>setIsOpen(true)}
      onMouseLeave={()=>setIsOpen(false)}
      >
        <div className='flex justify-center items-center gap-0'
        style={{color:'white',position:'absolute',left:'10px',bottom:'10px',zIndex:2,
          padding:'5px',
          borderRadius:'5px',
          border:'1px solid #3b3b3b'
        }}>
          <p className='text-white text-sm  '>Projects</p>
 <ChevronRightIcon style={{color:'white',fontSize:'30px'}}/>

 </div>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      </div>

    <div className="min-h-screen w-screen flex items-center justify-center bg-black relative">
       <div style={{backgroundColor:"black"}} class="_RayContainer_1ti3k_1" data-theme="dark" data-chat-started="true"><div class="_LightRay_1ti3k_23 _RayOne_1ti3k_28"></div><div class="_LightRay_1ti3k_23 _RayTwo_1ti3k_36"></div><div class="_LightRay_1ti3k_23 _RayThree_1ti3k_46"></div><div class="_LightRay_1ti3k_23 _RayFour_1ti3k_55"></div><div class="_LightRay_1ti3k_23 _RayFive_1ti3k_65"></div></div>
      <div className="p-0 bg-[transparent] rounded-lg shadow-md w-screen  relative">
      
       <h1 className='text-white text-5xl font-bold'>What do you want to build?</h1>
       <p className='text-[#A3A3A3] mt-2 text-lg'>Prompt, run, edit full-stack <span className='text-white'>web</span> apps.</p>
    
        <form onSubmit={handleSubmit} className='mt-5 max-w-xl mx-auto mb-5'>
        <div className="relative bottom-0 w-[100%]  h-[40%] p-2 pt-0 relative rounded-lg border-[1px] border-gray-700 bg-[#141414] " >
    <svg class="_PromptEffectContainer_1nqq4_1"><defs><linearGradient id="line-gradient" x1="20%" y1="0%" x2="-14%" y2="10%" gradientUnits="userSpaceOnUse" gradientTransform="rotate(-45)"><stop offset="0%" stop-color="#1488fc" stop-opacity="0%"></stop><stop offset="40%" stop-color="#1488fc" stop-opacity="80%"></stop><stop offset="50%" stop-color="#1488fc" stop-opacity="80%"></stop><stop offset="100%" stop-color="#1488fc" stop-opacity="0%"></stop></linearGradient><linearGradient id="shine-gradient"><stop offset="0%" stop-color="white" stop-opacity="0%"></stop><stop offset="40%" stop-color="#8adaff" stop-opacity="80%"></stop><stop offset="50%" stop-color="#8adaff" stop-opacity="80%"></stop><stop offset="100%" stop-color="white" stop-opacity="0%"></stop></linearGradient></defs><rect class="_PromptEffectLine_1nqq4_10" pathLength="100" stroke-linecap="round"></rect><rect class="_PromptShine_1nqq4_22" x="48" y="24" width="70" height="1"></rect></svg>
    <div class="border-transparent" style={{height: "0px"}}><div class="overflow-hidden h-full border-bolt-elements-borderColor relative bg-bolt-elements-background-depth-2 transition-opacity duration-200 rounded-t-[0.44rem] border-b-px left-0 right-0 opacity-0"><div class="flex py-2.5 px-2.5 font-medium text-xs"><div class="flex justify-between items-center w-full"><div></div><button class="bg-transparent text-bolt-elements-link hover:underline">Clear</button></div></div></div></div>
    <div class="border-b-px border-transparent" style={{height: "0px"}}><div class="overflow-hidden h-full border-bolt-elements-borderColor relative bg-bolt-elements-background-depth-2 transition-opacity duration-200 rounded-t-[0.44rem] border-b-px left-0 right-0 opacity-0"><div class="flex text-xs py-1.5 px-2.5 font-medium"><div class="flex-grow"></div><button class="bg-transparent text-bolt-elements-link hover:underline">Update</button></div></div></div>
        <div className="relative">
          {isDraggingOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-70 rounded-md border-2 border-dashed border-blue-400 z-10">
              <div className="text-white text-center">
                <p className="text-lg font-semibold">Drop image here</p>
                <p className="text-sm">Release to upload</p>
              </div>
            </div>
          )}
           {draggedImage && (
            <div className="w-[fit-content] relative top-2 mb-2 left-0 text-[10px] text-white ml-2 lowercase border-[1px] border-gray-100 rounded-md p-1 flex items-center">
              <img 
                src={draggedImage.data} 
                alt={draggedImage.name} 
                className="w-6 h-6 mr-1 object-cover" 
              />
              {draggedImage.name}
              <CloseIcon
                className="w-2 h-2 cursor-pointer ml-1"
                style={{color:"white", fontSize:"15px"}}
                onClick={() => {
                  setDraggedImage(null);
                  setImgBase64('');
                }}
              />
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
            placeholder="Describe your website..."
          />
          
         
        </div>
          <div className='relative'>
            <input
              type="file"
              id="file-input"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <label 
              htmlFor="file-input" 
              className='cursor-pointer flex items-center'
              style={{ color: 'grey' }}
            >
              <AttachFileIcon className="hover:text-blue-500 transition-colors"/>
             
            </label>
          </div>
          {prompt.length > 0 && (
          <button
            type="submit"
            className=" bg-blue-500 text-white p-2 flex items-center justify-center mr-3 rounded-md hover:bg-blue-600 absolute top-4 right-0"
          >
            <EastIcon style={{color:'white',fontSize:'15px'}}/>
          </button>
          )}
          </div>
        </form>
        <div className='flex justify-center items-center gap-2'>
        <div className='flex justify-center items-center border-[1px] border-gray-700 rounded-full p-2 px-4 w-[fit-content]   '>
        <p className='text-white  text-sm cursor-pointer' onClick={()=>{
          setPrompt('Create a counter react app');
        }}>Create a counter react app</p>
        </div>
        <div className='flex justify-center items-center border-[1px] border-gray-700 rounded-full p-2 px-4 w-[fit-content]   '>
        <p className='text-white  text-sm cursor-pointer' onClick={()=>{
          setPrompt('Create a course selling website in react');
        }}>Create a course selling website in react</p>
        </div>
        <div className='flex justify-center items-center border-[1px] border-gray-700 rounded-full p-2 px-4 w-[fit-content]   '>
        <p className='text-white  text-sm cursor-pointer' onClick={()=>{
          setPrompt('Create a budget tracker react app');
        }}>Create a budget tracker react app</p>
        </div>
        </div>
      </div>
    </div>
   
    {/* Gemini API Key Modal */}
  {/* Gemini API Key Modal */}
<Modal
  open={apiKeyModalOpen}
  onClose={handleCloseApiKeyModal}
  aria-labelledby="api-key-modal-title"
>
  <Box sx={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 450,
    bgcolor: '#1e1e1e',
    border: '1px solid #333',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
    color: 'white'
  }}>
    <h2 id="api-key-modal-title" className="text-xl font-semibold mb-4">
      Google Gemini API Key
    </h2>
    
    <div className="mb-4 text-gray-300 text-sm">
      <p className="mb-2">
        Adding your Gemini API key will enable enhanced AI features that are private to your session only. 
        Your API key is stored locally on your device and is not shared with other users.
      </p>
      <p className="mb-2">
        You can get your API key from the official Google AI Studio.
      </p>
      <a 
        href="https://ai.google.dev/gemini-api/docs/api-key" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
      >
        <span>Get your Gemini API key</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </a>
    </div>
    
    {geminiApiKey && !isEditing ? (
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <CheckCircleIcon sx={{ color: 'green', mr: 1 }} />
          <span className="text-green-500">API Key is set</span>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button 
            variant="outlined" 
            startIcon={<EditIcon />}
            onClick={handleEditApiKey}
            sx={{ 
              borderColor: '#3b82f6',
              color: '#3b82f6',
              '&:hover': {
                borderColor: '#2563eb',
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
              }
            }}
          >
            Edit
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<DeleteIcon />}
            onClick={handleDeleteApiKey}
            sx={{ 
              borderColor: '#ef4444',
              color: '#ef4444',
              '&:hover': {
                borderColor: '#dc2626',
                backgroundColor: 'rgba(239, 68, 68, 0.1)'
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    ) : (
      <TextField
        autoFocus
        margin="dense"
        id="api-key"
        label="Enter Gemini API Key"
        type="text"
        fullWidth
        variant="outlined"
        value={tempApiKey}
        onChange={(e) => setTempApiKey(e.target.value)}
        sx={{
          mb: 3,
          '& .MuiOutlinedInput-root': {
            color: 'white',
            '& fieldset': {
              borderColor: '#4b5563',
            },
            '&:hover fieldset': {
              borderColor: '#6b7280',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#9ca3af',
          },
        }}
      />
    )}
    
    <div className="flex justify-end gap-2">
      <Button 
        onClick={handleCloseApiKeyModal}
        sx={{ 
          color: '#9ca3af',
          '&:hover': {
            backgroundColor: 'rgba(156, 163, 175, 0.1)'
          }
        }}
      >
        Cancel
      </Button>
      
      {(!geminiApiKey || isEditing) && (
        <Button 
          onClick={handleApiKeySubmit}
          disabled={!tempApiKey.trim()}
          sx={{ 
            bgcolor: '#3b82f6', 
            color: 'white',
            '&:hover': {
              bgcolor: '#2563eb',
            },
            '&.Mui-disabled': {
              bgcolor: '#1e293b',
              color: '#4b5563'
            }
          }}
        >
          Save
        </Button>
      )}
    </div>
  </Box>
</Modal>
    </>
  );
}

export default HomePage; 