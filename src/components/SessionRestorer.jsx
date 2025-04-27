import { useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import parseXMLContent from './xmlParser';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { inspectorScript } from './inspectorScript';

const GET_CHAT_HISTORY = gql`
  query GetChatHistory($sessionId: String!) {
    getChatHistory(sessionId: $sessionId) {
      folderStructure {
        path
        content
        type
      }
         messages {
    role
    content
    timestamp
  }
  title
    }
  }
`;

const convertToFilesState = (fileArray) => {
    const filesState = {};
    fileArray.forEach(file => {
      const parts = file.path.split('/');
      let current = filesState;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = { type: 'file', content: file.content };
        } else {
          if (!current[part]) {
            current[part] = { type: 'folder', children: {} };
          }
          current = current[part].children;
        }
      }
    });
    return filesState;
  };

function unwrapRootFolder(filesState) {
  // If filesState has only one key and it's an empty string or something like 'root', unwrap it
  const keys = Object.keys(filesState);
  if (keys.length === 1 && filesState[keys[0]].type === 'folder') {
    // If you want to always unwrap the only folder at root
    return filesState[keys[0]].children;
  }
  return filesState;
}

const SessionRestorer = ({ sessionId, oldSession, setFiles, webcontainer,setPromptId,setUserPromptsList,stepCounter,setStepCounter,setSteps,setMessageSent,setMainTitle,mainTitle,sessionIdParam }) => {
  const { data, loading, error } = useQuery(GET_CHAT_HISTORY, {
    variables: { sessionId:sessionIdParam },
    skip:  !sessionIdParam,
    fetchPolicy: 'network-only'
  });

  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (data?.getChatHistory?.folderStructure && webcontainer) {
      const filesState = convertToFilesState(data.getChatHistory.folderStructure);
      const unwrappedState = unwrapRootFolder(filesState);
      setFiles(unwrappedState);

      // Write files to webcontainer
      const writeFiles = async (files, basePath = '') => {
        for (const [name, file] of Object.entries(files)) {
          const path = basePath ? `${basePath}/${name}` : name;
          if (file.type === 'file') {
            const folder = path.split('/').slice(0, -1).join('/');
            if (folder) await webcontainer.fs.mkdir(folder, { recursive: true });

            let contentToWrite = file.content;
            if (path === 'index.html') {
              // Add the script before the closing body tag if it exists
              if (file.content.includes('</body>')) {
                contentToWrite = file.content.replace('</body>', `${inspectorScript}</body>`);
              } else {
                // If no body tag, append the script at the end
                contentToWrite = file.content + inspectorScript;
              }
            }

            await webcontainer.fs.writeFile(path, contentToWrite);
          } else if (file.type === 'folder') {
            await writeFiles(file.children, path);
          }
        }
      };
      writeFiles(unwrappedState);

      // --- Steps and User Prompts Restore Logic ---
      const messages = data.getChatHistory.messages || [];
      if (messages.length > 2) {
        // 1. Build user prompts list (skip first two system prompts)
        const userPrompts = [];
        const steps = [];
        let promptId = 0;
        let mainTitleSetted=false;

        for (let i = 2; i < messages.length; i++) {
          const msg = messages[i];
          if (msg.role === "user") {
            userPrompts.push(msg.content);
          } else if (msg.role === "assistant") {
            // Parse steps from assistant message
            const parsedSteps = parseXMLContent(msg.content);
            console.log(parsedSteps,"parsedSteps")
            // Attach promptId to each step
            parsedSteps.forEach(step => {
                if(!mainTitle&&!mainTitleSetted&&step.type=="title"){
                    console.log("step.title aaja bhai",step.title)
                    setMainTitle(step.title);
                    mainTitleSetted=true;
                }
              steps.push({
                ...step,
                status: 'completed',
                promptId:promptId+1,
                id: steps.length + 1 // or use a better unique id if needed
              });
            });
            promptId++;
          }
        }

        setUserPromptsList(userPrompts);
        setSteps(steps);
        setPromptId(promptId); // so next prompt gets correct id
        setStepCounter(steps.length + 1); // so next step gets correct id
        setMessageSent(true);
      }
    }
  }, [data, setFiles, webcontainer]);

  if (loading) return null;
  if (error) {
    // Show modal if error (e.g., no access)
    return (
      <Modal
        open={true}
        onClose={() => {
          setOpen(false);
          navigate('/');
        }}
        aria-labelledby="access-denied-modal-title"
        aria-describedby="access-denied-modal-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 350,
          bgcolor: '#141414',
          ":focus-visible":'none',
          color:"white",
          border: '2px solid grey',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          textAlign: 'center'
        }}>
          <h2 id="access-denied-modal-title">Access Denied</h2>
          <p id="access-denied-modal-description" style={{ margin: '20px 0' }}>
            You don't have access to this project.
          </p>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/')}
            sx={{ marginRight: 2 }}
          >
            OK
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
        </Box>
      </Modal>
    );
  }
  return null;
};

export default SessionRestorer;