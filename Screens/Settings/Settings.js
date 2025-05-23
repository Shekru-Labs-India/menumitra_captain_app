import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Card, Surface } from 'react-native-paper';
import CustomHeader from '../../components/CustomHeader';
import RemixIcon from 'react-native-remix-icon';
import CustomTabBar from '../CustomTabBar';
import { LinearGradient } from 'expo-linear-gradient';
import { getRestaurantId, getUserId } from '../utils/getOwnerData';
import axiosInstance from '../../utils/axiosConfig';
import { onGetProductionUrl } from '../utils/ConstantFunctions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSettings, saveSettings } from '../../utils/getSettings';
import { usePrinter } from '../../contexts/PrinterContext';

const Settings = ({ navigation }) => {
  // Loading states
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Modal visibility states
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [styleModalVisible, setStyleModalVisible] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    theme: 'System',
    style: 'Orange',
    has_parcel: true,
    has_counter: true,
    has_delivery: true,
    has_drive_through: true,
    has_dine_in: true,
    POS_show_menu_image: true,
    print_and_save: true,
    KOT_and_save: true,
    settle: true,
    reserve_table: true,
    cancel: true,
    has_save: true,
  });

  // Theme and style options
  const themeOptions = ['System', 'Light', 'Dark'];
  const styleOptions = ['Orange', 'Blue', 'Green', 'Purple', 'Red'];

  // Toast state variables
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Add refreshing state for pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // Replace the single savingSettings state with a more specific tracking object
  const [loadingSettings, setLoadingSettings] = useState({});

  // Add printer context
  const { printerDevice, isConnected } = usePrinter();

  // Handle theme selection
  const handleThemeSelect = async (theme) => {
    setThemeModalVisible(false);
    const apiTheme = theme.toLowerCase();
    await updateSetting('theme', apiTheme);
  };

  // Handle style selection
  const handleStyleSelect = async (style) => {
    setStyleModalVisible(false);
    const apiStyle = style.toLowerCase();
    await updateSetting('style', apiStyle);
  };

  // Fetch settings on component mount
  useEffect(() => {
    fetchCurrentSettings();
  }, []);

  // Function to fetch current settings
  const fetchCurrentSettings = async () => {
    setLoading(true);
    try {
      // First try to get settings from AsyncStorage
      const savedSettings = await getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
        console.log("Loaded settings from storage:", savedSettings);
        setLoading(false);
        return;
      }
      
      // If we get here, we need to fetch from API
      // (The getSettings function should already handle this, but just in case)
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");
      
      if (!restaurantId || !accessToken) {
        throw new Error("Missing restaurant ID or access token");
      }
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + 'default_settings',
        {
          outlet_id: restaurantId
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.st === 1) {
        const { data } = response.data;
        
        // Use the exact values from API without default values
        const formattedSettings = {
          theme: data.theme || 'system',
          style: data.style || 'blue',
          has_parcel: data.has_parcel,
          has_counter: data.has_counter,
          has_delivery: data.has_delivery,
          has_drive_through: data.has_drive_through,
          has_dine_in: data.has_dine_in,
          POS_show_menu_image: data.POS_show_menu_image,
          print_and_save: data.print_and_save,
          KOT_and_save: data.KOT_and_save,
          settle: data.settle,
          reserve_table: data.reserve_table,
          cancel: data.cancel,
          has_save: data.has_save,
        };
        
        // Update state with formatted settings
        setSettings(formattedSettings);
        
        // Save to AsyncStorage
        await saveSettings(formattedSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Try to get settings from AsyncStorage as fallback
      const storedSettings = await AsyncStorage.getItem("app_settings");
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to show toast messages
  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
      });
    }, 3000);
  };

  // Modify the updateSetting function to use specific loading states
  const updateSetting = async (type, value) => {
    // Set loading state for just this specific setting
    setLoadingSettings(prev => ({ ...prev, [type]: true }));
    
    try {
      // First update local state for immediate UI feedback
      const updatedSettings = {
        ...settings,
        [type]: value
      };
      
      // Update state
      setSettings(updatedSettings);
      
      // Save to AsyncStorage for persistence
      await saveSettings(updatedSettings);
      console.log(`Setting ${type} updated to ${value} and saved to storage`);
      
      // Optional API call if you need server sync
      const restaurantId = await getRestaurantId();
      const userId = await getUserId();
      const accessToken = await AsyncStorage.getItem("access_token");
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + 'change_settings',
        {
          outlet_id: restaurantId,
          user_id: userId,
          type,
          value
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.st === 1) {
        // Replace Alert with toast
        showToast('Setting updated successfully');
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      // Replace Alert with toast
      showToast('Failed to update setting', 'error');
    } finally {
      // Clear loading state for just this specific setting
      setLoadingSettings(prev => ({ ...prev, [type]: false }));
    }
  };

  // Function to reset all settings to default
  const handleResetDefaults = async () => {
    setLoading(true);
    try {
      // Call the API to get default settings
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");
      
      if (!restaurantId || !accessToken) {
        throw new Error("Missing restaurant ID or access token");
      }
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + 'default_settings',
        {
          outlet_id: restaurantId
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data && response.data.st === 1) {
        // Check the structure of the API response
        console.log("Default settings API response:", response.data);
        
        // Get the settings object from the correct path in the response
        // The API seems to use data instead of settings based on your fetchCurrentSettings function
        const { data } = response.data;
        
        if (!data) {
          throw new Error("Invalid response format from settings API");
        }
        
        // Format settings the same way as in fetchCurrentSettings
        const formattedSettings = {
          theme: data.theme || 'system',
          style: data.style || 'blue',
          has_parcel: data.has_parcel,
          has_counter: data.has_counter,
          has_delivery: data.has_delivery,
          has_drive_through: data.has_drive_through,
          has_dine_in: data.has_dine_in,
          POS_show_menu_image: data.POS_show_menu_image,
          print_and_save: data.print_and_save,
          KOT_and_save: data.KOT_and_save,
          settle: data.settle,
          reserve_table: data.reserve_table,
          cancel: data.cancel,
          has_save: data.has_save,
        };
        
        // Update state
        setSettings(formattedSettings);
        
        // Save to AsyncStorage
        await saveSettings(formattedSettings);
        
        console.log("Settings reset to defaults and saved to storage:", formattedSettings);
        // Replace Alert with toast
        showToast("Settings reset to defaults");
      } else {
        // Replace Alert with toast
        showToast("Failed to reset settings to defaults", "error");
      }
    } catch (error) {
      console.error("Error resetting settings to defaults:", error);
      // Replace Alert with toast
      showToast("Failed to reset settings. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add a new function for refreshing settings using the outlet_settings_view API
  const refreshSettings = async () => {
    setRefreshing(true);
    try {
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");
      
      if (!restaurantId || !accessToken) {
        throw new Error("Missing restaurant ID or access token");
      }
      
      // Call the outlet_settings_view API
      const response = await axiosInstance.post(
        onGetProductionUrl() + 'outlet_settings_view',
        {
          outlet_id: restaurantId
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.st === 1) {
        const { data } = response.data;
        
        // Format the API response data to match our settings structure
        const formattedSettings = {
          theme: data.theme || 'system',
          style: data.style || 'orange',
          has_parcel: data.has_parcel,
          has_counter: data.has_counter,
          has_delivery: data.has_delivery,
          has_drive_through: data.has_drive_through,
          has_dine_in: data.has_dine_in,
          POS_show_menu_image: data.POS_show_menu_image,
          print_and_save: data.print_and_save,
          KOT_and_save: data.KOT_and_save,
          settle: data.settle,
          reserve_table: data.reserve_table,
          cancel: data.cancel,
          has_save: data.has_save,
        };
        
        // Update state with formatted settings
        setSettings(formattedSettings);
        
        // Save to AsyncStorage
        await saveSettings(formattedSettings);
        
        // Show success toast
        showToast("Settings refreshed successfully");
      } else {
        // Show error toast
        showToast("Failed to refresh settings", "error");
      }
    } catch (error) {
      console.error('Error refreshing settings:', error);
      showToast("Failed to refresh settings", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const renderSettingHeader = (icon, title, description) => (
    <View style={styles.sectionHeader}>
      <View style={styles.headerIconContainer}>
        <RemixIcon name={icon} size={24} color="#2196F3" />
      </View>
      <View style={styles.headerTextContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
    </View>
  );

  // Special render function for Order Types with blue toggle but black border
  const renderOrderTypeSwitch = (value, onValueChange, label, icon, disabled = false) => (
    <Surface style={[
      styles.switchContainer, 
      { 
        borderLeftWidth: 4,
        borderLeftColor: "#000000" // Black border
      }
    ]}>
      <View style={styles.switchContent}>
        <RemixIcon name={icon} size={22} color="#777777" />
        <Text style={[styles.switchLabel, { color: '#000000' }]}>{label}</Text>
      </View>
      {loadingSettings[value] ? (
        <ActivityIndicator size="small" color="#2196F3" />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#ddd", true: "#90CAF9" }} 
          thumbColor={value ? "#2196F3" : "#f4f3f4"} // Blue toggle when active
          ios_backgroundColor="#ddd"
          disabled={disabled}
        />
      )}
    </Surface>
  );

  const renderSwitch = (value, onValueChange, label, icon, disabled = false, color = '#666') => (
    <Surface style={[
      styles.switchContainer, 
      { 
        borderLeftWidth: 4,
        borderLeftColor: color || '#666'
      }
    ]}>
      <View style={styles.switchContent}>
        <RemixIcon name={icon} size={22} color="#777777" />
        <Text style={[styles.switchLabel, { color: '#000000' }]}>{label}</Text>
      </View>
      {loadingSettings[value] ? (
        <ActivityIndicator size="small" color="#2196F3" />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#ddd", true: color ? `${color}80` : "#90CAF9" }}
          thumbColor={value ? color || "#2196F3" : "#f4f3f4"}
          ios_backgroundColor="#ddd"
          disabled={disabled}
        />
      )}
    </Surface>
  );

  const renderDropdownItem = (title, value, icon) => (
    <TouchableOpacity
      onPress={() => {
        if (title === 'Theme') {
          setThemeModalVisible(true);
        } else if (title === 'Style') {
          setStyleModalVisible(true);
        }
      }}
    >
      <Surface style={styles.dropdownContainer}>
        <View style={styles.dropdownContent}>
          <RemixIcon name={icon} size={22} color="#666" />
          <View style={styles.dropdownTextContainer}>
            <Text style={styles.dropdownLabel}>{title}</Text>
            <Text style={styles.dropdownValue}>{value}</Text>
          </View>
          <RemixIcon name="arrow-down-s-line" size={22} color="#666" />
        </View>
      </Surface>
    </TouchableOpacity>
  );

  // Add Theme Selection Modal
  const renderThemeModal = () => (
    <Modal
      visible={themeModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setThemeModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Theme</Text>
          {themeOptions.map((theme) => (
            <TouchableOpacity
              key={theme}
              style={[
                styles.modalOption,
                settings.theme === theme && styles.selectedOption,
              ]}
              onPress={() => handleThemeSelect(theme)}
            >
              <Text 
                style={[
                  styles.modalOptionText,
                  settings.theme === theme && styles.selectedOptionText,
                ]}
              >
                {theme}
              </Text>
              {settings.theme === theme && (
                <RemixIcon name="check-line" size={20} color="#2196F3" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // // Add Style Selection Modal
  // const renderStyleModal = () => (
  //   <Modal
  //     visible={styleModalVisible}
  //     transparent={true}
  //     animationType="fade"
  //     onRequestClose={() => setStyleModalVisible(false)}
  //   >
  //     <TouchableOpacity
  //       style={styles.modalOverlay}
  //       activeOpacity={1}
  //       onPress={() => setStyleModalVisible(false)}
  //     >
  //       <View style={styles.modalContent}>
  //         <Text style={styles.modalTitle}>Select Style</Text>
  //         {styleOptions.map((style) => (
  //           <TouchableOpacity
  //             key={style}
  //             style={[
  //               styles.modalOption,
  //               settings.style === style && styles.selectedOption,
  //             ]}
  //             onPress={() => handleStyleSelect(style)}
  //           >
  //             <View style={styles.styleOption}>
  //               <View 
  //                 style={[
  //                   styles.colorSample, 
  //                   { backgroundColor: getStyleColor(style) }
  //                 ]} 
  //               />
  //               <Text 
  //                 style={[
  //                   styles.modalOptionText,
  //                   settings.style === style && styles.selectedOptionText,
  //                 ]}
  //               >
  //                 {style}
  //               </Text>
  //             </View>
  //             {settings.style === style && (
  //               <RemixIcon name="check-line" size={20} color="#2196F3" />
  //             )}
  //           </TouchableOpacity>
  //         ))}
  //       </View>
  //     </TouchableOpacity>
  //   </Modal>
  // );

  // Helper to get color for style options
  const getStyleColor = (style) => {
    const colors = {
      Orange: '#FF9800',
      Blue: '#2196F3',
      Green: '#4CAF50',
      Purple: '#9C27B0',
      Red: '#F44336',
    };
    return colors[style] || '#FF9800';
  };

  if (loading) {
    return (
      <>
        <CustomHeader 
          title="Settings" 
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
        <CustomTabBar />
      </>
    );
  }

  return (
    <>
      <CustomHeader 
        title="Settings" 
        onBack={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={handleResetDefaults}
            disabled={loading || savingSettings}
          >
            <RemixIcon name="refresh-line" size={20} color="#fff" />
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        }
      />
      
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshSettings}
            colors={["#2196F3"]}
            tintColor="#2196F3"
          />
        }
      >
        <View style={styles.content}>
          {/* Printer Connection Card */}
          <TouchableOpacity 
            style={styles.printerCard}
            onPress={() => navigation.navigate("PrinterManagement")}
          >
            <View style={styles.printerCardContent}>
              <View style={styles.printerIconContainer}>
                <RemixIcon 
                  name="printer-line" 
                  size={28} 
                  color={isConnected ? "#4CAF50" : "#666"} 
                />
                {isConnected && (
                  <View style={styles.connectedStatusDot} />
                )}
              </View>
              <View style={styles.printerInfo}>
                <Text style={styles.printerTitle}>
                  {isConnected ? "Printer Connected" : "Printer Not Connected"}
                </Text>
                <Text style={styles.printerDetails}>
                  {isConnected 
                    ? `Connected to: ${printerDevice?.name || "Unknown Device"}` 
                    : "Tap to connect a printer"}
                </Text>
              </View>
              <RemixIcon name="arrow-right-s-line" size={24} color="#666" />
            </View>
          </TouchableOpacity>

          {/* Appearance Section */}
          <View style={styles.sectionWithoutCard}>
            {renderSettingHeader(
              "brush-line",
              "Appearance",
              "Customize your app's look and feel"
            )}
            <View style={styles.gridContainer}>
              {renderDropdownItem("Theme", settings.theme, "contrast-2-line")}
              {/* {renderDropdownItem("Style", settings.style, "palette-line")} */}
            </View>
          </View>

          {/* Order Types Section */}
          <View style={styles.sectionWithoutCard}>
            {renderSettingHeader(
              "shopping-bag-3-line",
              "Order Types",
              "Manage available order options"
            )}
            <View style={styles.gridContainer}>
              {renderOrderTypeSwitch(
                settings.has_parcel, 
                (val) => updateSetting('has_parcel', val),
                "Parcel",
                "hand-heart-fill",
                loadingSettings.has_parcel
              )}
              {renderOrderTypeSwitch(
                settings.has_counter, 
                (val) => updateSetting('has_counter', val),
                "Counter",
                "store-2-fill",
                loadingSettings.has_counter
              )}
              {renderOrderTypeSwitch(
                settings.has_delivery, 
                (val) => updateSetting('has_delivery', val),
                "Delivery",
                "motorbike-fill",
                loadingSettings.has_delivery
              )}
              {renderOrderTypeSwitch(
                settings.has_drive_through, 
                (val) => updateSetting('has_drive_through', val),
                "Drive Through",
                "car-fill",
                loadingSettings.has_drive_through
              )}
            </View>
          </View>

          {/* Menu Settings */}
          <View style={styles.sectionWithoutCard}>
            {renderSettingHeader(
              "image-2-line",
              "Menu Settings",
              "Configure menu display options"
            )}
            {renderSwitch(
              settings.POS_show_menu_image, 
              (val) => updateSetting('POS_show_menu_image', val), 
              "Show Menu Images",
              "image-line",
              loadingSettings.POS_show_menu_image
            )}
          </View>

          {/* Order Management */}
          <View style={styles.sectionWithoutCard}>
            {renderSettingHeader(
              "settings-4-line",
              "Order Management",
              "Configure order processing options"
            )}
            <View style={styles.gridContainer}>
              {renderSwitch(
                settings.print_and_save, 
                (val) => updateSetting('print_and_save', val),
                "Print & Save",
                "printer-line",
                loadingSettings.print_and_save,
                "#FF9800" // Orange for print & save
              )}
              {renderSwitch(
                settings.KOT_and_save, 
                (val) => updateSetting('KOT_and_save', val),
                "KOT & Save",
                "save-line",
                loadingSettings.KOT_and_save,
                "#000000" // Black for KOT & save
              )}
              {renderSwitch(
                settings.has_save, 
                (val) => updateSetting('has_save', val),
                "Save",
                "save-3-line",
                loadingSettings.has_save,
                "#4CAF50" // Green for save
              )}
              {renderSwitch(
                settings.settle, 
                (val) => updateSetting('settle', val),
                "Settle",
                "check-line",
                loadingSettings.settle,
                "#87CEEB" // Sky blue for settle
              )}
              {renderSwitch(
                settings.reserve_table, 
                (val) => updateSetting('reserve_table', val),
                "Reserve Table",
                "reserved-line",
                loadingSettings.reserve_table,
                "#808080" // Grey for reserve table
              )}
              {renderSwitch(
                settings.cancel, 
                (val) => updateSetting('cancel', val),
                "Cancel Order",
                "close-circle-line",
                loadingSettings.cancel,
                "#F44336" // Red for cancel order
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      <CustomTabBar />
      
      {/* Add modals */}
      {renderThemeModal()}
      {/* {renderStyleModal()} */}
      
      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View style={[
          styles.toast, 
          {opacity: fadeAnim},
          toastType === 'error' ? {backgroundColor: '#e74c3c'} : {backgroundColor: '#2ecc71'}
        ]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionWithoutCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginBottom: 8,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
  },
  gridContainer: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  switchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  dropdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownTextContainer: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  dropdownValue: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderRadius: 8,
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
    borderWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#2196F3',
    fontWeight: '500',
  },
  styleOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorSample: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  toastText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  printerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    overflow: 'hidden',
  },
  printerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  printerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  connectedStatusDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    top: 0,
    right: 0,
    borderWidth: 1,
    borderColor: '#fff',
  },
  printerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  printerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  printerDetails: {
    fontSize: 14,
    color: '#666',
  },
});

export default Settings; 