import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useUser } from './UserProvider';
const GoogleAuth = ({ client }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {updateUser}=useUser();
  const dotStyle = {
    animation: "blink 1s infinite",
    fontSize: "20px",
  };
  
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes blink {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    // Check if there's an authorization code in the URL
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');

    if (code) {
      handleGoogleAuth(code);
    }
  }, [location]);

  const handleGoogleAuth = async (code) => {
    try {
      const mutation = gql`
        mutation GoogleAuth($code: String!) {
          googleAuth(code: $code) {
            token
            user {
              id
              name
              email
              picture
            }
          }
        }
      `;

      const { data } = await client.mutate({
        mutation,
        variables: { code }
      });
    //   console.log(data);

      // Store token and user data
      localStorage.setItem('token', data.googleAuth.token);
      localStorage.setItem('user', JSON.stringify(data.googleAuth.user));
      // updateUserImage(data.googleAuth.user.picture);
      updateUser(data.googleAuth.user);

      // Redirect to home or dashboard
      navigate('/');
    } catch (error) {
      console.error('Google auth error:', error);
    }
  };

  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",width:"100vw"}}>
     <h1 style={{ fontSize: "20px", color: "white" }}>
  Authenticating
  <span style={{ display: "inline-block" }}>
    <span style={dotStyle}>.</span>
    <span style={{ ...dotStyle, animationDelay: "0.2s" }}>.</span>
    <span style={{ ...dotStyle, animationDelay: "0.4s" }}>.</span>
  </span>
</h1>

    </div>
  ); // This is just a handler component, no UI needed
};

export default GoogleAuth;