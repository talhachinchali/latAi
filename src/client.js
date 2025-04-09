import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// Create an HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: import.meta.env.VITE_BACKEND_URL,
  credentials: 'include',  // Important for cookies
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}` ,// Add token from localStorage
    'Access-Control-Allow-Origin': '*',  // Add this for CORS
    'Access-Control-Allow-Credentials': 'true' 
  }
});


// Create a WebSocket link for subscriptions using graphql-ws
const wsLink = new GraphQLWsLink(createClient({
  url: import.meta.env.VITE_BACKEND_WS_URL,
}));

// Use split to send data to each link based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

export default client;