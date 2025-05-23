import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { TextInput } from 'react-native-paper';
import CustomHeader from '../../components/CustomHeader';
import RemixIcon from 'react-native-remix-icon';
import * as ImagePicker from 'expo-image-picker';
import { getRestaurantId, getUserId } from '../utils/getOwnerData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onGetProductionUrl } from '../utils/ConstantFunctions';
import axiosInstance from '../../utils/axiosConfig';
import CustomTabBar from '../CustomTabBar';

const CreateTicketScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachment1, setAttachment1] = useState(null);
  const [attachment2, setAttachment2] = useState(null);

  const pickImage = async (attachmentNumber) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        if (attachmentNumber === 1) {
          setAttachment1(result.assets[0]);
        } else {
          setAttachment2(result.assets[0]);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const createTicket = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const [userId, restaurantId, accessToken] = await Promise.all([
        getUserId(),
        getRestaurantId(),
        AsyncStorage.getItem('access_token')
      ]);

      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('outlet_id', restaurantId);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('status', 'open');

      if (attachment1) {
        const fileExtension = attachment1.uri.split('.').pop();
        formData.append('attachment_1', {
          uri: attachment1.uri,
          type: `image/${fileExtension}`,
          name: `attachment1.${fileExtension}`
        });
      }

      if (attachment2) {
        const fileExtension = attachment2.uri.split('.').pop();
        formData.append('attachment_2', {
          uri: attachment2.uri,
          type: `image/${fileExtension}`,
          name: `attachment2.${fileExtension}`
        });
      }

      const response = await axiosInstance.post(
        onGetProductionUrl() + 'create_ticket',
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert('Success', 'Ticket created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', response.data.msg || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Create Support Ticket" 
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.content}>
        <TextInput
          label="Title *"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Description *"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        <Text style={styles.attachmentTitle}>Attachments (Optional)</Text>
        
        <View style={styles.attachmentsContainer}>
          <TouchableOpacity 
            style={styles.attachmentButton} 
            onPress={() => pickImage(1)}
          >
            {attachment1 ? (
              <Image source={{ uri: attachment1.uri }} style={styles.attachmentPreview} />
            ) : (
              <>
                <RemixIcon name="image-add-line" size={24} color="#0066FF" />
                <Text style={styles.attachmentText}>Add Image 1</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.attachmentButton}
            onPress={() => pickImage(2)}
          >
            {attachment2 ? (
              <Image source={{ uri: attachment2.uri }} style={styles.attachmentPreview} />
            ) : (
              <>
                <RemixIcon name="image-add-line" size={24} color="#0066FF" />
                <Text style={styles.attachmentText}>Add Image 2</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={createTicket}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <RemixIcon name="send-plane-fill" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Ticket</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      
      <CustomTabBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  attachmentTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#333',
  },
  attachmentsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  attachmentButton: {
    width: '48%',
    height: 120,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  attachmentText: {
    marginTop: 8,
    color: '#666',
  },
  attachmentPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#0066FF',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CreateTicketScreen; 