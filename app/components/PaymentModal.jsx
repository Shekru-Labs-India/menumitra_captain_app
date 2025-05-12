import React from "react";
import {
  Modal,
  Box,
  Pressable,
  Icon,
  VStack,
  HStack,
  Text,
  Button,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";

const PaymentModal = ({
  isOpen,
  onClose,
  tableData,
  paymentSuccess,
  paymentLoading,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  isPaid,
  setIsPaid,
  onSettlePayment,
}) => {
  // Get order type with proper capitalization
  const getOrderTypeDisplay = () => {
    const orderType = tableData?.order_type || "dine-in";
    return orderType
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("-");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick={!paymentLoading}
    >
      <Modal.Content maxWidth="350px" p={4} borderRadius="md" bg="white">
        {/* Close button */}
        <Pressable
          position="absolute"
          right={3}
          top={2}
          zIndex={2}
          onPress={onClose}
        >
          <Icon as={MaterialIcons} name="close" size="sm" color="coolGray.500" />
        </Pressable>

        {/* Header */}
        <Box mb={5} mt={2}>
          <Text fontSize="sm" color="coolGray.600">
            {tableData?.order_type && tableData.order_type !== "dine-in"
              ? getOrderTypeDisplay()
              : `Table ${tableData?.table_number}`}{" "}
            | Order #{tableData?.order_number} | ₹
            {tableData?.grand_total?.toFixed(2)}
          </Text>
        </Box>

        {/* Success State */}
        {paymentSuccess ? (
          <VStack space={4} alignItems="center" py={3}>
            <Icon
              as={MaterialIcons}
              name="check-circle"
              size="6xl"
              color="green.500"
            />
            <Text
              fontSize="lg"
              fontWeight="bold"
              color="green.500"
              textAlign="center"
            >
              Payment Settled Successfully
            </Text>
          </VStack>
        ) : (
          <>
            {/* Payment Method Selection */}
            <Box mb={4}>
              <Text
                fontSize="sm"
                fontWeight="medium"
                color="coolGray.700"
                mb={3}
              >
                Select Payment Method
              </Text>

              <HStack space={3} alignItems="center">
                {/* CASH Option */}
                <HStack alignItems="center" space={1}>
                  <Pressable
                    onPress={() => setSelectedPaymentMethod("cash")}
                    disabled={paymentLoading}
                  >
                    <Box
                      width={5}
                      height={5}
                      rounded="full"
                      borderWidth={1}
                      borderColor="#0891b2"
                      justifyContent="center"
                      alignItems="center"
                    >
                      {selectedPaymentMethod === "cash" && (
                        <Box width={3} height={3} rounded="full" bg="#0891b2" />
                      )}
                    </Box>
                  </Pressable>
                  <Text fontSize="sm" color="coolGray.700">
                    CASH
                  </Text>
                </HStack>

                {/* UPI Option */}
                <HStack alignItems="center" space={1}>
                  <Pressable
                    onPress={() => setSelectedPaymentMethod("upi")}
                    disabled={paymentLoading}
                  >
                    <Box
                      width={5}
                      height={5}
                      rounded="full"
                      borderWidth={1}
                      borderColor="#0891b2"
                      justifyContent="center"
                      alignItems="center"
                    >
                      {selectedPaymentMethod === "upi" && (
                        <Box width={3} height={3} rounded="full" bg="#0891b2" />
                      )}
                    </Box>
                  </Pressable>
                  <Text fontSize="sm" color="coolGray.700">
                    UPI
                  </Text>
                </HStack>

                {/* CARD Option */}
                <HStack alignItems="center" space={1}>
                  <Pressable
                    onPress={() => setSelectedPaymentMethod("card")}
                    disabled={paymentLoading}
                  >
                    <Box
                      width={5}
                      height={5}
                      rounded="full"
                      borderWidth={1}
                      borderColor="#0891b2"
                      justifyContent="center"
                      alignItems="center"
                    >
                      {selectedPaymentMethod === "card" && (
                        <Box width={3} height={3} rounded="full" bg="#0891b2" />
                      )}
                    </Box>
                  </Pressable>
                  <Text fontSize="sm" color="coolGray.700">
                    CARD
                  </Text>
                </HStack>

                {/* Paid Checkbox - aligned to the right */}
                <Pressable
                  onPress={() => setIsPaid(!isPaid)}
                  disabled={paymentLoading}
                  ml="auto"
                  flexDirection="row"
                  alignItems="center"
                >
                  <HStack space={1} alignItems="center">
                    <Box
                      width={5}
                      height={5}
                      rounded="sm"
                      borderWidth={1}
                      borderColor="#0891b2"
                      justifyContent="center"
                      alignItems="center"
                      bg={isPaid ? "#0891b2" : "transparent"}
                    >
                      {isPaid && (
                        <Icon
                          as={MaterialIcons}
                          name="check"
                          size="xs"
                          color="white"
                        />
                      )}
                    </Box>
                    <Text fontSize="sm" color="coolGray.700">
                      Paid
                    </Text>
                  </HStack>
                </Pressable>
              </HStack>
            </Box>

            {/* Settle Button */}
            <Button
              width="100%"
              height="45px"
              bg="#0891b2"
              _pressed={{ bg: "#0891b2" }}
              rounded="md"
              onPress={onSettlePayment}
              isLoading={paymentLoading}
              isLoadingText="Settling..."
              _text={{ fontWeight: "medium" }}
              startIcon={
                <Icon as={MaterialIcons} name="check" size="sm" color="white" />
              }
              isDisabled={paymentLoading || !selectedPaymentMethod || !isPaid}
              opacity={!selectedPaymentMethod || !isPaid ? 0.7 : 1}
            >
              Settle
            </Button>
          </>
        )}
      </Modal.Content>
    </Modal>
  );
};

export default PaymentModal; 