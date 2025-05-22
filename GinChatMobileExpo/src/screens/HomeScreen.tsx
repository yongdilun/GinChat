import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Button } from 'react-native';

interface Post {
  id: number;
  title: string;
  body: string;
}

const HomeScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data
    setTimeout(() => {
      const dummyPosts = [
        { id: 1, title: 'Welcome to GinChat', body: 'A modern chat application built with React Native' },
        { id: 2, title: 'Getting Started', body: 'Explore the app using the bottom navigation tabs' },
        { id: 3, title: 'Chat Features', body: 'Real-time messaging, group chats, and more!' },
      ];
      setPosts(dummyPosts);
      setLoading(false);
    }, 1000);
  }, []);

  const renderItem = ({ item }: { item: Post }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <View style={styles.divider} />
      <Text style={styles.cardBody}>{item.body}</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="Learn More"
          onPress={() => {}}
          color="#2196F3"
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome to GinChat</Text>
      <Text style={styles.subheader}>Your modern messaging platform</Text>
      
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  subheader: {
    fontSize: 16,
    marginBottom: 24,
    color: '#666',
  },
  listContainer: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e1e1',
    marginVertical: 8,
  },
  cardBody: {
    fontSize: 14,
    marginBottom: 16,
    color: '#444',
  },
  buttonContainer: {
    marginTop: 8,
  },
});

export default HomeScreen; 