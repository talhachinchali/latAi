import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { Skeleton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EastIcon from '@mui/icons-material/East';

const GET_USER_CHAT_SESSIONS = gql`
  query GetUserChatSessions {
    getUserChatSessions {
      sessionId
      title
      createdAt
      updatedAt
    }
  }
`;

const DELETE_CHAT_SESSION = gql`
  mutation DeleteChatSession($sessionId: String!) {
    deleteChatSession(sessionId: $sessionId)
  }
`;

function Sidebar({isOpen, setIsOpen}) {
  
  const navigate = useNavigate();

  const { data: sessionsData, loading: sessionsLoading } = useQuery(GET_USER_CHAT_SESSIONS, {
    skip: !localStorage.getItem('token'),
    fetchPolicy: 'network-only'
  });

  const [deleteChatSession] = useMutation(DELETE_CHAT_SESSION, {
    refetchQueries: [{ query: GET_USER_CHAT_SESSIONS }]
  });

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await deleteChatSession({ variables: { sessionId } });
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  return (
    <div 
      className="h-[100%] flex relative z-20 bg-red"
      style={{
        position:'absolute',
        bottom:0,
        width: isOpen ? '30vw' : '0%',
        transition: 'width 0.3s ease-in-out',
        overflow: 'hidden',
        // boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
        borderTopRightRadius: '50px',
        borderBottomRightRadius: '50px',
        // backgroundColor: 'red'
      }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Hover trigger area */}
      <div className="w-[10%] h-full absolute left-0 top-0" />
      
      {/* Sidebar content */}
      <div 
        className={`bg-[#1a1a1a] h-full transition-all duration-300 ease-in-out ${
          isOpen ? 'w-80' : 'w-0'
        } overflow-hidden shadow-lg`}
        style={{
          borderTopRightRadius: '50px',
          borderBottomRightRadius: '50px',
          border: '1px solid #3b3b3b'
        }}
      >
        <div className="p-4 mt-20">
          <h2 className="text-white text-xl font-semibold mb-4 text-start">Recent Sessions</h2>
          {sessionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={60} sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
              ))}
            </div>
          ) : sessionsData?.getUserChatSessions?.length > 0 ? (
            <div className="space-y-2">
              {sessionsData.getUserChatSessions.map((session) => (
                <div 
                  key={session.sessionId}
                  className="bg-[#1e1e1e] p-4 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => navigate(`/workspace/${session.sessionId}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white text-sm text-start"> {session.title}</p>
                      <p className="text-gray-400 text-xs text-start">
                        Created: {new Date(Number(session?.createdAt)).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DeleteIcon 
                        className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        onClick={(e) => handleDeleteSession(session.sessionId, e)}
                      />
                      <EastIcon className="text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No recent sessions found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Sidebar; 