import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  IconButton,
  Heading,
  Input,
  TextArea,
  Button,
  useToast,
  Select,
  CheckIcon,
  Image,
  Pressable,
} from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../config/api.config';
import { fetchWithAuth } from '../../utils/apiInterceptor';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

const CreateTicketScreen = () => {
  const router = useRouter();
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      toast.show({
        description: "Failed to pick image",
        status: "error"
      });
    }
  };

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.show({
        description: "Please fill in all required fields",
        status: "warning"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const [outletId, captainId, deviceToken] = await AsyncStorage.multiGet([
        'outlet_id', 
        'captain_id',
        'device_token'
      ]);
      
      const formData = new FormData();
      formData.append('user_id', captainId[1]);
      formData.append('outlet_id', outletId[1]);
      formData.append('title', subject.trim());
      formData.append('description', message.trim());
      formData.append('status', 'open');
      formData.append('priority', priority);
      formData.append('app', 'captain');
      formData.append('device_token', deviceToken[1] || '');

      if (attachment1) {
        const fileExtension = attachment1.uri.split('.').pop();
        const fileName = `attachment1.${fileExtension}`;
        // Handle file path for iOS
        const uri = Platform.OS === 'ios' ? attachment1.uri.replace('file://', '') : attachment1.uri;
        formData.append('attachment_1', {
          uri: uri,
          type: `image/${fileExtension}`,
          name: fileName,
          // Additional required properties for proper file upload
          size: attachment1.fileSize,
          lastModified: new Date().getTime(),
        });
      }

      if (attachment2) {
        const fileExtension = attachment2.uri.split('.').pop();
        const fileName = `attachment2.${fileExtension}`;
        // Handle file path for iOS
        const uri = Platform.OS === 'ios' ? attachment2.uri.replace('file://', '') : attachment2.uri;
        formData.append('attachment_2', {
          uri: uri,
          type: `image/${fileExtension}`,
          name: fileName,
          // Additional required properties for proper file upload
          size: attachment2.fileSize,
          lastModified: new Date().getTime(),
        });
      }

      console.log('FormData being sent:', JSON.stringify(Array.from(formData.entries())));

      const response = await fetchWithAuth(`${getBaseUrl()}/create_ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        body: formData
      });

      if (response.st === 1) {
        toast.show({
          description: "Ticket submitted successfully",
          status: "success"
        });
        router.back();
      } else {
        throw new Error(response.msg || 'Failed to submit ticket');
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.show({
        description: "Failed to submit ticket. Please try again.",
        status: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      {/* Header */}
      <HStack
        px={4}
        py={3}
        justifyContent="space-between"
        alignItems="center"
        bg="white"
        shadow={2}
      >
        <IconButton
          icon={<MaterialIcons name="arrow-back" size={24} color="gray" />}
          onPress={() => router.back()}
          variant="ghost"
          _pressed={{
            bg: "coolGray.100",
          }}
          borderRadius="full"
        />
        <Heading size="md" flex={1} textAlign="center">
          Create Support Ticket
        </Heading>
        <Box w={10} />
      </HStack>

      <ScrollView p={4}>
        <VStack space={4}>
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <VStack space={4}>
              <Input
                placeholder="Subject"
                value={subject}
                onChangeText={setSubject}
                size="lg"
                _focus={{
                  borderColor: "blue.500",
                  bg: "white",
                }}
              />

              <Select
                selectedValue={priority}
                minWidth="200"
                accessibilityLabel="Choose Priority"
                placeholder="Select Priority"
                _selectedItem={{
                  bg: "blue.100",
                  endIcon: <CheckIcon size="5" />
                }}
                mt={1}
                onValueChange={itemValue => setPriority(itemValue)}
              >
                <Select.Item label="Low Priority" value="low" />
                <Select.Item label="Normal Priority" value="normal" />
                <Select.Item label="High Priority" value="high" />
                <Select.Item label="Urgent" value="urgent" />
              </Select>

              <TextArea
                placeholder="Describe your issue in detail..."
                value={message}
                onChangeText={setMessage}
                autoCompleteType={false}
                h={40}
                _focus={{
                  borderColor: "blue.500",
                  bg: "white",
                }}
              />

              <Text fontSize="md" color="coolGray.600" mb={2}>
                Attachments (Optional)
              </Text>
              <HStack space={4} justifyContent="space-between">
                <Pressable
                  flex={1}
                  h={120}
                  bg="coolGray.50"
                  rounded="lg"
                  borderWidth={1}
                  borderStyle="dashed"
                  borderColor="coolGray.300"
                  justifyContent="center"
                  alignItems="center"
                  overflow="hidden"
                  onPress={() => pickImage(1)}
                >
                  {attachment1 ? (
                    <Image
                      source={{ uri: attachment1.uri }}
                      alt="Attachment 1"
                      w="full"
                      h="full"
                      resizeMode="cover"
                    />
                  ) : (
                    <VStack alignItems="center" space={2}>
                      <MaterialIcons name="add-photo-alternate" size={24} color="#0066FF" />
                      <Text fontSize="sm" color="coolGray.600">Add Image 1</Text>
                    </VStack>
                  )}
                </Pressable>

                <Pressable
                  flex={1}
                  h={120}
                  bg="coolGray.50"
                  rounded="lg"
                  borderWidth={1}
                  borderStyle="dashed"
                  borderColor="coolGray.300"
                  justifyContent="center"
                  alignItems="center"
                  overflow="hidden"
                  onPress={() => pickImage(2)}
                >
                  {attachment2 ? (
                    <Image
                      source={{ uri: attachment2.uri }}
                      alt="Attachment 2"
                      w="full"
                      h="full"
                      resizeMode="cover"
                    />
                  ) : (
                    <VStack alignItems="center" space={2}>
                      <MaterialIcons name="add-photo-alternate" size={24} color="#0066FF" />
                      <Text fontSize="sm" color="coolGray.600">Add Image 2</Text>
                    </VStack>
                  )}
                </Pressable>
              </HStack>

              <Button
                onPress={handleSubmitTicket}
                isLoading={isSubmitting}
                isLoadingText="Submitting"
                bg="blue.500"
                _pressed={{ bg: "blue.600" }}
              >
                Submit Ticket
              </Button>
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
};

export default CreateTicketScreen; 