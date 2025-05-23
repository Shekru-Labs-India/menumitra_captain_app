import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import RemixIcon from 'react-native-remix-icon';

/**
 * PaymentModal - A reusable payment modal component
 * @param {boolean} visible - Controls visibility of the modal
 * @param {function} onClose - Function to call when modal is closed
 * @param {function} onConfirm - Function to call when payment is confirmed, passes (paymentMethod, isPaid)
 * @param {object} orderData - Order data object containing details about the order
 */
const PaymentModal = ({ visible, onClose, onConfirm, orderData }) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('CASH');
  const [isPaid, setIsPaid] = useState(true);

  // Determine if the order is complementary
  const isComplementary = orderData?.is_complementary === 1 || 
                          orderData?.is_complementary === true || 
                          orderData?.is_paid === "complementary";
  
  // Determine if the order is already paid with a payment method
  const isAlreadyPaid = orderData?.is_paid === 1 || 
                        orderData?.is_paid === "paid" || 
                        orderData?.is_paid === true;

  // Calculate the amount to display
  const orderAmount = orderData?.final_grand_total || orderData?.grand_total || '0.00';

  // Initialize payment method and paid status based on order data
  useEffect(() => {
    if (orderData) {
      // Reset payment method to CASH for new/unpaid orders
      if (orderData.is_paid === 0 || 
          orderData.is_paid === "unpaid" || 
          orderData.is_paid === false || 
          !orderData.is_paid) {
        setSelectedPaymentMethod('CASH');
      } 
      // Set existing payment method if already paid
      else if (orderData.payment_method) {
        setSelectedPaymentMethod(orderData.payment_method.toUpperCase());
      } else {
        // Default fallback to CASH
        setSelectedPaymentMethod('CASH');
      }
      
      // Set paid status
      setIsPaid(isAlreadyPaid);
    } else {
      // Default values if no order data
      setSelectedPaymentMethod('CASH');
      setIsPaid(true);
    }
  }, [orderData, isAlreadyPaid, visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={onClose}
              >
                <RemixIcon name="close-line" size={24} color="#000" />
              </TouchableOpacity>

              <Text style={styles.paymentModalTitle}>
                {orderData?.order_type === "dine-in" 
                  ? `Table ${orderData?.table_number} | Order No: ${orderData?.order_number}`
                  : `${orderData?.order_type?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} | Order No: ${orderData?.order_number}`
                } | ₹{orderAmount}
              </Text>

              {isComplementary ? (
                <View style={styles.complementaryContainer}>
                  <View style={styles.complementaryBadge}>
                    <Text style={styles.complementaryText}>COMPLEMENTARY ORDER</Text>
                  </View>
                  <Text style={styles.complementaryNote}>
                    This order is marked as complementary. No payment required.
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.settleButton}
                    onPress={() => onConfirm('COMPLEMENTARY', true)}
                  >
                    <RemixIcon name="check-line" size={20} color="#fff" />
                    <Text style={styles.settleButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              ) : isAlreadyPaid && orderData?.payment_method ? (
                <View style={styles.paidContainer}>
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidText}>PAID</Text>
                  </View>
                  <Text style={styles.paidNote}>
                    This order has been paid with {orderData.payment_method.toUpperCase()}.
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.settleButton}
                    onPress={() => onConfirm(orderData.payment_method.toUpperCase(), true)}
                  >
                    <RemixIcon name="check-line" size={20} color="#fff" />
                    <Text style={styles.settleButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.paymentMethodLabel}>Select Payment Method</Text>

                  <View style={styles.paymentOptionsContainer}>
                    <View style={styles.paymentMethodsRow}>
                      <TouchableOpacity
                        style={styles.paymentOption}
                        onPress={() => setSelectedPaymentMethod('CASH')}
                      >
                        <View style={styles.radioButtonContainer}>
                          <View style={[
                            styles.radioButton,
                            selectedPaymentMethod === 'CASH' && styles.radioButtonSelected
                          ]}>
                            {selectedPaymentMethod === 'CASH' && (
                              <View style={styles.radioButtonInner} />
                            )}
                          </View>
                          <Text style={styles.paymentOptionText}>CASH</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.paymentOption}
                        onPress={() => setSelectedPaymentMethod('UPI')}
                      >
                        <View style={styles.radioButtonContainer}>
                          <View style={[
                            styles.radioButton,
                            selectedPaymentMethod === 'UPI' && styles.radioButtonSelected
                          ]}>
                            {selectedPaymentMethod === 'UPI' && (
                              <View style={styles.radioButtonInner} />
                            )}
                          </View>
                          <Text style={styles.paymentOptionText}>UPI</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.paymentOption}
                        onPress={() => setSelectedPaymentMethod('CARD')}
                      >
                        <View style={styles.radioButtonContainer}>
                          <View style={[
                            styles.radioButton,
                            selectedPaymentMethod === 'CARD' && styles.radioButtonSelected
                          ]}>
                            {selectedPaymentMethod === 'CARD' && (
                              <View style={styles.radioButtonInner} />
                            )}
                          </View>
                          <Text style={styles.paymentOptionText}>CARD</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.paidCheckboxContainer}
                        onPress={() => setIsPaid(!isPaid)}
                      >
                        <View style={[
                          styles.checkbox,
                          isPaid && styles.checkboxChecked
                        ]}>
                          {isPaid && (
                            <RemixIcon name="check-line" size={12} color="#fff" />
                          )}
                        </View>
                        <Text style={styles.paidText}>Paid</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.settleButton,
                      !isPaid && styles.settleButtonDisabled
                    ]}
                    onPress={() => onConfirm(selectedPaymentMethod, isPaid)}
                    disabled={!isPaid}
                  >
                    <RemixIcon name="check-line" size={20} color="#fff" />
                    <Text style={styles.settleButtonText}>Settle</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
    textAlign: 'left',
    paddingRight: 20, // Space for close button
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 15,
    textAlign: 'left',
  },
  paymentOptionsContainer: {
    marginBottom: 20,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentOption: {
    marginBottom: 12,
    marginRight: 16,
  },
  radioButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioButtonSelected: {
    borderColor: '#0dcaf0',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0dcaf0',
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  closeModalButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 5,
    zIndex: 1,
  },
  paidCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  paidText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  settleButton: {
    backgroundColor: '#0dcaf0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    elevation: 2,
  },
  settleButtonDisabled: {
    backgroundColor: '#ccc',
  },
  settleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  complementaryContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f4fc',
    borderRadius: 8,
    marginBottom: 16,
  },
  complementaryBadge: {
    backgroundColor: '#9c27b0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  complementaryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  complementaryNote: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
    fontSize: 14,
  },
  paidContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f1f9f1',
    borderRadius: 8,
    marginBottom: 16,
  },
  paidBadge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  paidNote: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
    fontSize: 14,
  }
});

export default PaymentModal; 