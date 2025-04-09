import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useUser } from './UserProvider';
const GoogleAuth = ({ client }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {updateUser}=useUser();

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

  return null; // This is just a handler component, no UI needed
};

export default GoogleAuth;