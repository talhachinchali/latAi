import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import Workspace from './components/Workspace';
import './App.css';
import './test.css';
import { ApolloProvider } from '@apollo/client';
import client from './client';
import GoogleAuth from './GoogleAuth';
import { UserProvider } from './UserProvider';
function App() {
  return (
    <ApolloProvider client={client}>
      <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/auth/google/callback" element={<GoogleAuth client={client} />} />
        </Routes>
      </Router>
      </UserProvider>
    </ApolloProvider>
  );
}

export default App;