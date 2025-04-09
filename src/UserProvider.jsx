import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userImage, setUserImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateUserImage = async (imageUrl) => {
    if (!imageUrl) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load image');

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setUserImage(objectUrl);
    } catch (error) {
      console.error('Failed to update user image:', error);
      setUserImage(null);
    }
  };

  
  const updateUser = (userData) => {
    setUser(userData);
    if (userData?.picture) {
      updateUserImage(userData.picture);
    }
    localStorage.setItem('user', JSON.stringify(userData));
  };
  useEffect(()=>{
  console.log("u[adate user in context",user);
  },[user]);

  const clearUser = () => {
    setUser(null);
    setUserImage(null);
    localStorage.clear();
  };

  return (
    <UserContext.Provider 
      value={{ 
        user, 
        userImage, 
        isLoading, 
        updateUser, 
        clearUser,
        updateUserImage 
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};