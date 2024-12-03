import { useState, useEffect } from "react";
import {
  Box,
  ScrollView,
  Heading,
  HStack,
  VStack,
  Text,
  IconButton,
  Button,
  useToast,
  AlertDialog,
  Icon,
  Divider,
  Badge,
  Avatar,
  Fab,
} from "native-base";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar, Linking } from "react-native";

export default function StaffDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();

  const [staff, setStaff] = useState(null);
  const [deleteAlert, setDeleteAlert] = useState(false);

  // Fetch staff details when component mounts
  useEffect(() => {
    if (!global.staffData) {
      global.staffData = [];
    }

    const foundStaff = global.staffData.find((s) => s.id === id);
    if (foundStaff) {
      setStaff(foundStaff);
    } else {
      toast.show({
        description: "Staff member not found",
        status: "error",
      });
      router.back();
    }
  }, [id]);

  const handleEdit = () => {
    router.push(`/staff/edit/${id}`);
  };

  const handleDelete = () => {
    global.staffData = global.staffData.filter((item) => item.id !== id);
    router.back();
    toast.show({
      description: "Staff member deleted successfully",
      status: "success",
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "present":
        return "success";
      case "absent":
        return "danger";
      case "on leave":
        return "warning";
      default:
        return "info";
    }
  };

  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  if (!staff) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Header */}
      <HStack
        px={4}
        py={3}
        justifyContent="space-between"
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
        bg="coolGray.50"
      >
        <IconButton
          icon={<Icon as={Ionicons} name="arrow-back" size={6} />}
          onPress={() => router.back()}
        />
        <Heading size="lg" flex={1} textAlign="center">
          Staff Details
        </Heading>
        <IconButton
          icon={
            <Icon as={Ionicons} name="trash-outline" size={6} color="red.500" />
          }
          onPress={() => setDeleteAlert(true)}
        />
      </HStack>

      <ScrollView>
        <VStack space={6} p={4}>
          {/* Profile Section */}
          <VStack space={4} alignItems="center">
            <Avatar
              size="2xl"
              bg="cyan.500"
              source={staff.avatar ? { uri: staff.avatar } : null}
            >
              {staff.name?.charAt(0)}
            </Avatar>
            <VStack space={2} alignItems="center">
              <Heading size="xl">{staff.name}</Heading>
              <Text fontSize="md" color="coolGray.600">
                {staff.role}
              </Text>
              <Badge
                colorScheme={getStatusColor(staff.status)}
                variant="subtle"
                rounded="full"
                px={3}
                py={1}
              >
                {staff.status}
              </Badge>
            </VStack>
          </VStack>

          <Divider />

          {/* Contact Information */}
          <VStack space={4}>
            <Heading size="md">Contact Information</Heading>
            <VStack space={3}>
              <HStack space={3} alignItems="center">
                <Icon
                  as={Ionicons}
                  name="call-outline"
                  size={5}
                  color="coolGray.500"
                />
                <Text flex={1}>{staff.phone}</Text>
                <Icon
                  as={Ionicons}
                  name="call"
                  size={5}
                  color="green.500"
                  onPress={() => handleCall(staff.phone)}
                />
              </HStack>
              <HStack space={3} alignItems="center">
                <Icon
                  as={Ionicons}
                  name="location-outline"
                  size={5}
                  color="coolGray.500"
                />
                <Text flex={1}>{staff.address || "Address not provided"}</Text>
              </HStack>
              <HStack space={3} alignItems="center">
                <Icon
                  as={Ionicons}
                  name="alert-circle-outline"
                  size={5}
                  color="coolGray.500"
                />
                <Text flex={1}>
                  {staff.emergencyContact || "Emergency contact not provided"}
                </Text>
              </HStack>
            </VStack>
          </VStack>

          <Divider />

          {/* Employment Details */}
          <VStack space={4}>
            <Heading size="md">Employment Details</Heading>
            <VStack space={3}>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Join Date</Text>
                <Text>{staff.joinDate}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Salary</Text>
                <Text>₹{staff.salary}/month</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Employee ID</Text>
                <Text>{staff.id}</Text>
              </HStack>
            </VStack>
          </VStack>
        </VStack>
      </ScrollView>

      {/* Delete Confirmation */}
      <AlertDialog
        isOpen={deleteAlert}
        onClose={() => setDeleteAlert(false)}
        leastDestructiveRef={undefined}
        closeOnOverlayClick={true}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Delete Staff</AlertDialog.Header>
          <AlertDialog.Body>
            Are you sure you want to delete this staff member? This action
            cannot be undone.
          </AlertDialog.Body>
          <AlertDialog.Footer justifyContent="space-between">
            <Button variant="ghost" onPress={() => setDeleteAlert(false)}>
              Close
            </Button>
            <Button colorScheme="danger" onPress={handleDelete}>
              Delete
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>

      {/* Floating Edit Button */}
      <Fab
        renderInPortal={false}
        shadow={3}
        size="sm"
        icon={
          <Icon color="white" as={Ionicons} name="create-outline" size="md" />
        }
        onPress={handleEdit}
        position="absolute"
        bottom={10}
        right={4}
      />
    </Box>
  );
}
