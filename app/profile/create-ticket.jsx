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
} from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../config/api.config';
import { fetchWithAuth } from '../../utils/apiInterceptor';

const CreateTicketScreen = () => {
  const router = useRouter();
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.show({
        description: "Please fill in all fields",
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

      const response = await fetchWithAuth(`${getBaseUrl()}/create_ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
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