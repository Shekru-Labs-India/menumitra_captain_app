import React from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  ScrollView,
  Pressable,
  Image,
  Heading,
  Button,
  IconButton,
} from "native-base";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// Import food images
const foodImages = {
  butterChicken: require("../../../assets/food/burger-with-melted-cheese.jpg"),
  maharashtrianThali: require("../../../assets/food/burger-with-melted-cheese.jpg"),
};

export default function OrderDetailsScreen() {
  const router = useRouter();
  return (
    <Box flex={1} bg="gray.50" safeArea position="relative">
      <Box
        px={4}
        py={3}
        bg="white"
        shadow={2}
        mb={1}
        borderBottomWidth={1}
        borderBottomColor="gray.100"
        position="relative"
        zIndex={1}
      >
        <HStack alignItems="center" justifyContent="space-between">
          <IconButton
            icon={
              <Icon as={Ionicons} name="arrow-back" size={6} color="gray.800" />
            }
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "gray.100" }}
            position="absolute"
            left={0}
            zIndex={1}
          />
          <Heading size="lg" flex={1} textAlign="center">
            Order Details
          </Heading>
        </HStack>
      </Box>

      <ScrollView flex={1} px={4}>
        {/* Order Info */}
        <HStack justifyContent="space-between" alignItems="center" mt={3}>
          <Text fontSize="lg" fontWeight="">
            Completed order
          </Text>
          <Text fontSize="sm" color="gray.500">
            19 Nov 2024{" "}
          </Text>
        </HStack>
        <Box bg="white" p={4} rounded="lg" shadow={1} mb={4}>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="lg" fontWeight="bold">
              #847291
            </Text>
            <Text fontSize="sm" color="gray.500">
              {" "}
              03:58 PM
            </Text>
          </HStack>
          <HStack justifyContent="space-between" alignItems="center">
            <HStack space={3} alignItems="center">
              <Icon
                as={Ionicons}
                name="business-outline"
                size={4}
                color="gray.600"
              />
              <VStack>
                <Text fontSize="md" fontWeight="semibold">
                  VIRAJ HOTEL PUNE
                </Text>
              </VStack>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              1
            </Text>
          </HStack>

          <HStack justifyContent="space-between" alignItems="center">
            <HStack space={3} alignItems="center">
              <VStack>
                <Text fontSize="md" fontWeight="semibold"></Text>
              </VStack>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              Garden
            </Text>
          </HStack>

          <HStack justifyContent="space-between" alignItems="center">
            <HStack space={2} alignItems="center">
              <Icon
                as={Ionicons}
                name="receipt-outline"
                size={3}
                color="gray.600"
              />
              <Text fontSize="md" fontWeight="semibold">
                2 Menu
              </Text>
            </HStack>
            <HStack space={2} alignItems="center">
              <Text fontSize="sm" fontWeight="semibold" color="blue.500">
                ₹500
              </Text>
              <Text
                fontSize="xs"
                color="gray.400"
                textDecorationLine="line-through"
              >
                ₹100
              </Text>
            </HStack>
          </HStack>
        </Box>

        {/* Order Served Button */}
        <Button
          bg="green.500"
          rounded="lg"
          py={3}
          _pressed={{ bg: "green.600" }}
          mb={4}
        >
          Your delicious order has been served
        </Button>
        <Text
          alignSelf="center"
          bg="gray.100"
          px={4}
          py={1}
          rounded="full"
          mb={4}
        >
          Payment Method: Card
        </Text>
        {/* Card for Butter Chicken */}
        <Box bg="white" rounded="lg" shadow={1} mb={4}>
          <HStack space={3} alignItems="center">
            {/* Image Section */}
            <Box position="relative">
              <Image
                source={foodImages.butterChicken}
                alt="Butter Chicken"
                resizeMode="cover" // Ensures the image fills the available space
                height="100px" // Set the desired height for the image
                width="100px" // Set the desired width for the image
                rounded="lg"
                fallbackSource={require("../../../assets/food/burger-with-melted-cheese.jpg")}
              />
              {/* Offer Badge */}
              <Box
                position="absolute"
                top={0}
                left={0}
                bg="red.500"
                px={2}
                py={1}
                roundedBottomRight="sm"
              >
                <Text fontSize="xs" color="white">
                  10% Off
                </Text>
              </Box>
            </Box>

            {/* Details Section */}
            <VStack flex={1}>
              {/* Food Name */}
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="md" fontWeight="semibold">
                  Butter Chicken
                </Text>
                {/* Star Rating */}
                <HStack alignItems="center" space={1} mr={2}>
                  <Icon as={Ionicons} name="star" size={4} color="orange.400" />
                  <Text fontSize="sm" color="gray.500">
                    4.5
                  </Text>
                </HStack>
              </HStack>

              {/* Row: Cuisine and Spicy Index */}
              <HStack space={2} alignItems="center" mt={1}>
                {/* Cuisine */}
                <HStack space={1} alignItems="center">
                  <Icon
                    as={Ionicons}
                    name="leaf-outline"
                    size={4}
                    color="green.500"
                  />
                  <Text fontSize="sm" color="gray.500">
                    NorthIndian
                  </Text>
                </HStack>

                {/* Spicy Indicator */}
                <HStack space={1}>
                  <Icon as={Ionicons} name="flame" size={4} color="red.500" />
                  <Icon as={Ionicons} name="flame" size={4} color="red.500" />
                  <Icon as={Ionicons} name="flame" size={4} color="gray.300" />
                </HStack>
              </HStack>

              {/* Price Section */}
              <HStack justifyContent="space-between" alignItems="center" mt={2}>
                {/* Price */}
                <HStack space={2} alignItems="center">
                  <Text fontSize="md" fontWeight="semibold" color="blue.500">
                    ₹300
                  </Text>
                  <Text
                    fontSize="sm"
                    color="gray.500"
                    textDecorationLine="line-through"
                  >
                    ₹333.33
                  </Text>
                </HStack>
                {/* Quantity */}
                <Text fontSize="sm" color="gray.500" mr={2}>
                  x1
                </Text>
              </HStack>
            </VStack>
          </HStack>
        </Box>

        {/* Card for Butter Chicken */}
        <Box bg="white" rounded="lg" shadow={1} mb={4}>
          <HStack space={3} alignItems="center">
            {/* Image Section */}
            <Box position="relative">
              <Image
                source={foodImages.butterChicken}
                alt="Butter Chicken"
                height="100px" // Set the desired height for the image
                width="100px" // Set the desired width for the image
                rounded="lg"
                fallbackSource={require("../../../assets/food/burger-with-melted-cheese.jpg")}
              />
              {/* Offer Badge */}
              <Box
                position="absolute"
                top={0}
                left={0}
                bg="red.500"
                px={2}
                py={1}
                roundedBottomRight="sm"
              >
                <Text fontSize="xs" color="white">
                  10% Off
                </Text>
              </Box>
            </Box>

            {/* Details Section */}
            <VStack flex={1}>
              {/* Food Name */}
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="md" fontWeight="semibold">
                  Butter Chicken
                </Text>
                {/* Star Rating */}
                <HStack alignItems="center" space={1} mr={2}>
                  <Icon as={Ionicons} name="star" size={4} color="orange.400" />
                  <Text fontSize="sm" color="gray.500">
                    4.5
                  </Text>
                </HStack>
              </HStack>

              {/* Row: Cuisine and Spicy Index */}
              <HStack space={2} alignItems="center" mt={1}>
                {/* Cuisine */}
                <HStack space={1} alignItems="center">
                  <Icon
                    as={Ionicons}
                    name="leaf-outline"
                    size={4}
                    color="green.500"
                  />
                  <Text fontSize="sm" color="gray.500">
                    NorthIndian
                  </Text>
                </HStack>

                {/* Spicy Indicator */}
                <HStack space={1}>
                  <Icon as={Ionicons} name="flame" size={4} color="red.500" />
                  <Icon as={Ionicons} name="flame" size={4} color="red.500" />
                  <Icon as={Ionicons} name="flame" size={4} color="gray.300" />
                </HStack>
              </HStack>

              {/* Price Section */}
              <HStack justifyContent="space-between" alignItems="center" mt={2}>
                {/* Price */}
                <HStack space={2} alignItems="center">
                  <Text fontSize="md" fontWeight="semibold" color="blue.500">
                    ₹300
                  </Text>
                  <Text
                    fontSize="sm"
                    color="gray.500"
                    textDecorationLine="line-through"
                  >
                    ₹333.33
                  </Text>
                </HStack>
                {/* Quantity */}
                <Text fontSize="sm" color="gray.500" mr={2}>
                  x1
                </Text>
              </HStack>
            </VStack>
          </HStack>
        </Box>

        {/* Price Breakdown */}
        <Box bg="white" p={3} rounded="lg" shadow={1} mb={4}>
          <VStack space={1}>
            <HStack justifyContent="space-between">
              <Text fontSize="sm" color="gray.500">
                Total
              </Text>
              <Text fontSize="sm">₹600.00</Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text fontSize="sm" color="gray.500">
                Service Charges (12%)
              </Text>
              <Text fontSize="sm">₹72.00</Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text fontSize="sm" color="gray.500">
                GST (8%)
              </Text>
              <Text fontSize="sm">₹57.76</Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text fontSize="sm" color="gray.500">
                Discount (20%)
              </Text>
              <Text fontSize="sm" color="red.500">
                -₹120.00
              </Text>
            </HStack>
            <HStack
              justifyContent="space-between"
              mt={2}
              pt={2}
              borderTopWidth={1}
              borderTopColor="gray.100"
            >
              <Text fontSize="md" fontWeight="semibold">
                Grand Total
              </Text>
              <Text fontSize="md" fontWeight="semibold" color="blue.500">
                ₹557.76
              </Text>
            </HStack>
          </VStack>
        </Box>

        {/* Payment Method */}

        {/* Invoice Button */}
        <HStack justifyContent="flex-end" px={4} py={2} mb={4}>
          <Pressable
            flexDirection="row"
            alignItems="center"
            bg="gray.100"
            px={4}
            py={2}
            rounded="full"
          >
            <Icon
              as={Ionicons}
              name="download-outline"
              size={4}
              color="gray.600"
            />
            <Text fontSize="sm" color="gray.600" ml={2}>
              Invoice
            </Text>
          </Pressable>
        </HStack>
      </ScrollView>
    </Box>
  );
}
