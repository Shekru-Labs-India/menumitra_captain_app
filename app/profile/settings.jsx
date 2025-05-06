import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Box,
  HStack,
  VStack,
  Text,
  Heading,
  IconButton,
  ScrollView,
  Switch,
  Pressable,
  Icon,
  Select,
  CheckIcon,
  useToast,
  Spinner,
  Center,
  useColorModeValue,
} from "native-base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorMode } from "native-base";
import { getBaseUrl } from "../../config/api.config";
import { fetchWithAuth } from "../../utils/apiInterceptor";
import { usePrinter } from "../../context/PrinterContext";
import { RefreshControl, Animated, Platform, AppState } from "react-native";

export default function SettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colorMode, toggleColorMode } = useColorMode();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState({});
  const [appState, setAppState] = useState(AppState.currentState);
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  const { 
    printerDevice, 
    isConnected: isPrinterConnected 
  } = usePrinter();
  
  const [settings, setSettings] = useState({
    theme: "system",
    style: "blue",
    showMenuImages: true,
    orderTypes: {
      dine_in: true,
      parcel: false,
      counter: false,
      delivery: false,
      driveThrough: false,
    },
    orderManagement: {
      print_and_save: true,
      KOT_and_save: true,
      settle: true,
      reserve_table: true,
      cancel: true,
    }
  });

  // Get colors for style previews
  const bgColor = useColorModeValue("white", "coolGray.800");
  const cardBg = useColorModeValue("coolGray.50", "coolGray.700");
  const textColor = useColorModeValue("coolGray.800", "white");
  const mutedTextColor = useColorModeValue("coolGray.500", "coolGray.400");

  // Use outlet_settings_view API to get latest settings from server
  const fetchLatestSettings = useCallback(async (showToast = false) => {
    try {
      if (!refreshing) {
        setIsLoading(true);
      }
      
      const outlet_id = await AsyncStorage.getItem("outlet_id");
      const device_token = await AsyncStorage.getItem("device_token");
      
      // Always fetch from server to ensure latest settings
      const response = await fetchWithAuth(`${getBaseUrl()}/outlet_settings_view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          outlet_id: outlet_id,
          device_token: device_token 
        })
      });

      if (response.st === 1 && response.data) {
        const data = response.data;
        
        // Ensure all toggle values are explicitly boolean
        const newSettings = {
          theme: data.theme,
          style: data.style,
          showMenuImages: Boolean(data.POS_show_menu_image),
          orderTypes: {
            dine_in: Boolean(data.has_dine_in),
            parcel: Boolean(data.has_parcel),
            counter: Boolean(data.has_counter),
            delivery: Boolean(data.has_delivery),
            driveThrough: Boolean(data.has_drive_through),
          },
          orderManagement: {
            print_and_save: Boolean(data.print_and_save),
            KOT_and_save: Boolean(data.KOT_and_save),
            settle: Boolean(data.settle),
            reserve_table: Boolean(data.reserve_table),
            cancel: Boolean(data.cancel),
          }
        };

        setSettings(newSettings);
        // Store settings in AsyncStorage for backup only
        await AsyncStorage.setItem("app_settings", JSON.stringify(data));

        if (showToast) {
          toast.show({
            description: "Settings updated successfully",
            status: "success",
            placement: "bottom",
            duration: 2000
          });
        }
      } else {
        // If API fails, try to load from backup in AsyncStorage
        const storedSettings = await AsyncStorage.getItem("app_settings");
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          setSettings({
            theme: parsedSettings.theme,
            style: parsedSettings.style,
            showMenuImages: Boolean(parsedSettings.POS_show_menu_image),
            orderTypes: {
              dine_in: Boolean(parsedSettings.has_dine_in),
              parcel: Boolean(parsedSettings.has_parcel),
              counter: Boolean(parsedSettings.has_counter),
              delivery: Boolean(parsedSettings.has_delivery),
              driveThrough: Boolean(parsedSettings.has_drive_through),
            },
            orderManagement: {
              print_and_save: Boolean(parsedSettings.print_and_save),
              KOT_and_save: Boolean(parsedSettings.KOT_and_save),
              settle: Boolean(parsedSettings.settle),
              reserve_table: Boolean(parsedSettings.reserve_table),
              cancel: Boolean(parsedSettings.cancel),
            }
          });
        }
        
        if (showToast) {
          toast.show({
            description: response.msg || "Failed to load settings",
            status: "error",
            placement: "bottom",
            duration: 2000
          });
        }
      }
    } catch (error) {
      if (showToast) {
        toast.show({
          description: "Error loading settings",
          status: "error",
          placement: "bottom",
          duration: 2000  
        });
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, toast]);

  // Reset to default settings
  const resetToDefaultSettings = async () => {
    try {
      setIsLoading(true);
      const outlet_id = await AsyncStorage.getItem("outlet_id");
      
      const response = await fetchWithAuth(`${getBaseUrl()}/default_settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_id: outlet_id })
      });

      if (response.st === 1 && response.data) {
        // After resetting to defaults, fetch latest settings to ensure consistency
        await fetchLatestSettings(true);
        
        toast.show({
          description: "Default settings applied successfully",
          status: "success",
          placement: "bottom",
          duration: 2000
        });
      } else {
        toast.show({
          description: response.msg || "Failed to reset settings",
          status: "error",
          placement: "bottom",
          duration: 2000
        });
      }
    } catch (error) {
      toast.show({
        description: "Error resetting settings",
        status: "error",
        placement: "bottom",
        duration: 2000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle app state change to refresh settings when app comes to foreground
  const handleAppStateChange = useCallback((nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground, refresh settings without toast
      fetchLatestSettings(false);
    }
    setAppState(nextAppState);
  }, [appState, fetchLatestSettings]);

  useEffect(() => {
    // Initial fetch of settings
    fetchLatestSettings(false);
    
    // Set up app state change listener to refresh settings when app becomes active
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Clean up the subscription on unmount
    return () => {
      subscription.remove();
    };
  }, [fetchLatestSettings, handleAppStateChange]);

  // Pull-to-refresh function
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLatestSettings(true);
  }, [fetchLatestSettings]);

  const updateSetting = async (type, value) => {
    // Set loading state for just this specific setting
    setLoadingSettings(prev => ({ ...prev, [type]: true }));
    
    try {
      const outlet_id = await AsyncStorage.getItem("outlet_id");
      const user_id = await AsyncStorage.getItem("captain_id");
      
      // First update local state for immediate UI feedback
      const updatedSettings = { ...settings };
      
      // Handle nested settings - ensure all values are explicitly boolean
      if (type === 'has_dine_in') {
        updatedSettings.orderTypes.dine_in = Boolean(value);
      } else if (type === 'has_parcel') {
        updatedSettings.orderTypes.parcel = Boolean(value);
      } else if (type === 'has_counter') {
        updatedSettings.orderTypes.counter = Boolean(value);
      } else if (type === 'has_delivery') {
        updatedSettings.orderTypes.delivery = Boolean(value);
      } else if (type === 'has_drive_through') {
        updatedSettings.orderTypes.driveThrough = Boolean(value);
      } else if (type === 'POS_show_menu_image') {
        updatedSettings.showMenuImages = Boolean(value);
      } else if (type === 'print_and_save' || type === 'KOT_and_save' || type === 'settle' || 
                type === 'reserve_table' || type === 'cancel') {
        updatedSettings.orderManagement[type] = Boolean(value);
      } else if (type === 'theme') {
        updatedSettings.theme = value;
      } else if (type === 'style') {
        updatedSettings.style = value;
      }
      
      // Update state right away for better UX
      setSettings(updatedSettings);
      
      const response = await fetchWithAuth(`${getBaseUrl()}/change_settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outlet_id,
          type: type,
          value: value,
          user_id: user_id
        })
      });

      if (response.st === 1) {
        // After successful update, fetch latest settings to ensure consistency
        // Pass false to avoid showing a toast message
        await fetchLatestSettings(false);

        toast.show({
          description: response.msg || "Settings updated successfully",
          status: "success",
          placement: "bottom",
          duration: 2000
        });
      } else {
        // Revert state change if the API call failed and fetch latest settings
        await fetchLatestSettings(false);
        
        toast.show({
          description: response.msg || "Failed to update setting",
          status: "error",
          placement: "bottom",
          duration: 2000
        });
      }
    } catch (error) {
      // Revert state change on error and fetch latest settings
      await fetchLatestSettings(false);
      
      toast.show({
        description: "Error updating setting",
        status: "error",
        placement: "bottom",
        duration: 2000
      });
    } finally {
      // Clear loading state for this specific setting
      setLoadingSettings(prev => ({ ...prev, [type]: false }));
    }
  };

  // Handle theme change
  const handleThemeChange = (value) => {
    updateSetting("theme", value);
  };

  // Handle style change
  const handleStyleChange = (value) => {
    updateSetting("style", value);
  };

  // Handle order type toggle
  const handleOrderTypeToggle = (type) => {
    const apiType = type === 'driveThrough' ? 'has_drive_through' : `has_${type}`;
    const newValue = !settings.orderTypes[type];
    updateSetting(apiType, newValue);
  };

  // Handle order management toggle
  const handleOrderManagementToggle = (feature) => {
    updateSetting(feature, !settings.orderManagement[feature]);
  };

  // Add printer navigation handler
  const handlePrinterPress = () => {
    router.push("/profile/PrinterManagement");
  };

  // Helper to get color for style options (matches owner app)
  const getStyleColor = (style) => {
    const colors = {
      orange: '#FF9800',
      blue: '#2196F3',
      green: '#4CAF50',
      purple: '#9C27B0',
      red: '#F44336',
      gold: '#FFD700',
    };
    return colors[style.toLowerCase()] || '#2196F3';
  };

  // Settings section component with icon
  const SettingsSection = ({ title, description, icon, iconColor = "blue.400", children }) => (
    <Box bg={bgColor} rounded="xl" shadow={1} mx={4} mb={4} overflow="hidden">
      <VStack>
        <HStack space={3} p={4} alignItems="center" bg={cardBg}>
          <Box bg={iconColor} p={2} rounded="lg" opacity={0.2}>
            <Icon 
              as={MaterialIcons} 
              name={icon} 
              size={6} 
              color={iconColor.replace('.400', '.700')} 
            />
          </Box>
          <VStack>
            <Heading size="sm" color={textColor}>{title}</Heading>
            {description && (
              <Text fontSize="xs" color={mutedTextColor} mt={0.5}>
                {description}
              </Text>
            )}
          </VStack>
        </HStack>
        <Box px={4} py={2}>
          {children}
        </Box>
      </VStack>
    </Box>
  );

  // Setting item component with dropdown support
  const SettingItem = ({ 
    icon, 
    title, 
    value, 
    onPress, 
    showChevron = true, 
    isLast = false,
    isDropdown = false,
    options = [],
    onSelect,
    type
  }) => {
    // Force value to be boolean for toggle switches
    const isToggleValue = typeof value === "boolean" || value === 0 || value === 1;
    const boolValue = isToggleValue ? Boolean(value) : false;
    
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        _pressed={{ bg: "coolGray.100" }}
      >
        <HStack 
          py={3.5} 
          px={1}
          justifyContent="space-between" 
          alignItems="center"
          borderBottomWidth={isLast ? 0 : 1}
          borderBottomColor="coolGray.100"
        >
          <HStack space={3} alignItems="center" flex={1}>
            <Icon as={MaterialIcons} name={icon} size={5} color="coolGray.500" />
            <Text fontSize="sm" color={textColor}>
              {title}
            </Text>
          </HStack>
          <HStack space={2} alignItems="center">
            {loadingSettings[type] ? (
              <Spinner size="sm" color="blue.500" />
            ) : isDropdown ? (
              <Select
                selectedValue={value}
                minWidth="120"
                accessibilityLabel={title}
                placeholder={title}
                onValueChange={onSelect}
                _selectedItem={{
                  bg: "coolGray.100",
                  endIcon: <CheckIcon size={4} />
                }}
                dropdownIcon={
                  <Icon
                    as={MaterialIcons}
                    name="arrow-drop-down"
                    size="6"
                    color="coolGray.500"
                  />
                }
              >
                {options.map((option) => (
                  <Select.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value}
                    leftIcon={
                      type === "style" ? (
                        <Box 
                          w="3" 
                          h="3" 
                          mr="2" 
                          rounded="full" 
                          bg={getStyleColor(option.value)} 
                        />
                      ) : null
                    }
                  />
                ))}
              </Select>
            ) : (
              <>
                {typeof value === "string" && !isDropdown && (
                  <Text fontSize="sm" color={mutedTextColor}>
                    {value}
                  </Text>
                )}
                {isToggleValue && (
                  <Switch
                    size="md"
                    isChecked={boolValue}
                    onToggle={onPress}
                    colorScheme="blue"
                    _track={{
                      bg: boolValue ? "blue.400" : "coolGray.200",
                    }}
                    isDisabled={loadingSettings[type]}
                  />
                )}
                {showChevron && !isDropdown && (
                  <Icon 
                    as={MaterialIcons} 
                    name="chevron-right" 
                    size={6} 
                    color="coolGray.400" 
                  />
                )}
              </>
            )}
          </HStack>
        </HStack>
      </Pressable>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <Center flex={1} bg="coolGray.50">
        <Spinner size="lg" color="blue.500" />
      </Center>
    );
  }

  return (
    <Box flex={1} bg="coolGray.50" safeArea>
      {/* Header */}
      <HStack
        px={4}
        py={3}
        justifyContent="space-between"
        alignItems="center"
        bg={bgColor}
        shadow={1}
      >
        <IconButton
          icon={<MaterialIcons name="arrow-back" size={24} color="gray" />}
          onPress={() => router.back()}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
        />
        <Heading size="md" flex={1} textAlign="center" color={textColor}>
          Settings
        </Heading>
        <Pressable 
          onPress={resetToDefaultSettings}
          bg="blue.500"
          px={3}
          py={1.5}
          rounded="full"
          _pressed={{ bg: "blue.600" }}
        >
          <HStack alignItems="center" space={1}>
            <Text color="white" fontWeight="medium" fontSize="sm">
              Reset
            </Text>
            <Icon 
              as={MaterialIcons} 
              name="refresh" 
              size={4} 
              color="white"
            />
          </HStack>
        </Pressable>
      </HStack>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        _contentContainerStyle={{ py: 4 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
            tintColor="#2196F3"
          />
        }
      >
        {/* Printer Section - Enhanced to match owner app */}
        <Pressable 
          onPress={handlePrinterPress}
          android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          _pressed={{ opacity: 0.8 }}
        >
          <Box bg={bgColor} rounded="xl" shadow={1} mx={4} mb={4} overflow="hidden">
            <HStack space={4} p={4} alignItems="center">
              <Box 
                p={3} 
                bg={isPrinterConnected ? "green.100" : "coolGray.100"} 
                rounded="full"
              >
                <Icon
                  as={MaterialIcons}
                  name="print"
                  size={6}
                  color={isPrinterConnected ? "green.600" : "coolGray.500"}
                />
              </Box>
              <VStack flex={1}>
                <Text fontSize="md" fontWeight="semibold" color={isPrinterConnected ? "green.600" : textColor}>
                  {isPrinterConnected ? "Printer Connected" : "Printer Not Connected"}
                </Text>
                <Text fontSize="sm" color={mutedTextColor} mt={0.5}>
                  {isPrinterConnected
                    ? `Connected to: ${printerDevice?.name || "Unknown Device"}`
                    : "Tap to connect a printer"}
                </Text>
              </VStack>
              <Icon
                as={MaterialIcons}
                name="chevron-right"
                size={6}
                color="coolGray.400"
              />
            </HStack>
          </Box>
        </Pressable>

        {/* Appearance */}
        <SettingsSection 
          title="Appearance" 
          description="Customize your app's look and feel"
          icon="palette"
          iconColor="blue.400"
        >
          <SettingItem
            icon="brightness-6"
            title="Theme"
            value={settings.theme}
            isDropdown={true}
            type="theme"
            options={[
              { label: "System", value: "system" },
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" }
            ]}
            onSelect={handleThemeChange}
          />
          <SettingItem
            icon="color-lens"
            title="Style"
            value={settings.style}
            isDropdown={true}
            type="style"
            options={[
              { label: "Blue", value: "blue" },
              { label: "Green", value: "green" },
              { label: "Red", value: "red" },
              { label: "Orange", value: "orange" },
              { label: "Purple", value: "purple" }
            ]}
            onSelect={handleStyleChange}
            isLast
          />
        </SettingsSection>

        {/* Order Types */}
        <SettingsSection 
          title="Order Types" 
          description="Manage available order options"
          icon="receipt"
          iconColor="purple.400"
        >
          <SettingItem
            icon="restaurant"
            title="Dine In"
            type="has_dine_in"
            value={settings.orderTypes.dine_in}
            onPress={() => handleOrderTypeToggle('dine_in')}
            showChevron={false}
          />
          <SettingItem
            icon="local-shipping"
            title="Parcel"
            type="has_parcel"
            value={settings.orderTypes.parcel}
            onPress={() => handleOrderTypeToggle('parcel')}
            showChevron={false}
          />
          <SettingItem
            icon="point-of-sale"
            title="Counter"
            type="has_counter"
            value={settings.orderTypes.counter}
            onPress={() => handleOrderTypeToggle('counter')}
            showChevron={false}
          />
          <SettingItem
            icon="delivery-dining"
            title="Delivery"
            type="has_delivery"
            value={settings.orderTypes.delivery}
            onPress={() => handleOrderTypeToggle('delivery')}
            showChevron={false}
          />
          <SettingItem
            icon="drive-eta"
            title="Drive Through"
            type="has_drive_through"
            value={settings.orderTypes.driveThrough}
            onPress={() => handleOrderTypeToggle('driveThrough')}
            showChevron={false}
            isLast
          />
        </SettingsSection>

        {/* Menu Settings */}
        <SettingsSection 
          title="Menu Settings" 
          description="Configure menu display options"
          icon="restaurant-menu"
          iconColor="green.400"
        >
          <SettingItem
            icon="image"
            title="Show Menu Images"
            type="POS_show_menu_image"
            value={settings.showMenuImages}
            onPress={() => {
              const newValue = !settings.showMenuImages;
              updateSetting('POS_show_menu_image', newValue);
            }}
            showChevron={false}
            isLast
          />
        </SettingsSection>

        {/* Order Management */}
        <SettingsSection 
          title="Order Management" 
          description="Configure order processing options"
          icon="settings"
          iconColor="orange.400"
        >
          <SettingItem
            icon="print"
            title="Print & Save"
            type="print_and_save"
            value={settings.orderManagement.print_and_save}
            onPress={() => handleOrderManagementToggle('print_and_save')}
            showChevron={false}
          />
          <SettingItem
            icon="receipt-long"
            title="KOT & Save"
            type="KOT_and_save"
            value={settings.orderManagement.KOT_and_save}
            onPress={() => handleOrderManagementToggle('KOT_and_save')}
            showChevron={false}
          />
          <SettingItem
            icon="check-circle"
            title="Settle"
            type="settle"
            value={settings.orderManagement.settle}
            onPress={() => handleOrderManagementToggle('settle')}
            showChevron={false}
          />
          <SettingItem
            icon="event-seat"
            title="Reserve Table"
            type="reserve_table"
            value={settings.orderManagement.reserve_table}
            onPress={() => handleOrderManagementToggle('reserve_table')}
            showChevron={false}
          />
          <SettingItem
            icon="cancel"
            title="Cancel Order"
            type="cancel"
            value={settings.orderManagement.cancel}
            onPress={() => handleOrderManagementToggle('cancel')}
            showChevron={false}
            isLast
          />
        </SettingsSection>
      </ScrollView>
    </Box>
  );
} 