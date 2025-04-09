import { ApolloClient, InMemoryCache, HttpLink, split, setContext } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// Create the auth link
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : "",
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    }
  };
});

// Create an HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: import.meta.env.VITE_BACKEND_URL,
  credentials: 'include',  // Important for cookies
});

// Create a WebSocket link for subscriptions using graphql-ws
const wsLink = new GraphQLWsLink(createClient({
  url: import.meta.env.VITE_BACKEND_WS_URL,
}));

// Combine the auth link with the http link
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink), // Use authLink with httpLink
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

export default client;
