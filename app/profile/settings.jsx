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
  useColorModeValue,
} from "native-base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorMode } from "native-base";
import { getBaseUrl } from "../../config/api.config";
import { fetchWithAuth } from "../../utils/apiInterceptor";
import { usePrinter } from "../../context/PrinterContext";
import { RefreshControl, Animated, AppState } from "react-native";

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
      has_save: true,
      settle: true,
      reserve_table: true,
      cancel: true,
    }
  });

  // Colors
  const bgColor = useColorModeValue("white", "coolGray.800");
  const cardBg = useColorModeValue("coolGray.50", "coolGray.700");
  const textColor = useColorModeValue("coolGray.800", "white");
  const mutedTextColor = useColorModeValue("coolGray.500", "coolGray.400");

  // Get toggle colors matching owner app
  const getToggleColor = (type) => {
    const colors = {
      has_parcel: "#FF9800", // Orange
      has_counter: "#4CAF50", // Green
      has_delivery: "#2196F3", // Blue
      has_drive_through: "#9C27B0", // Purple
      print_and_save: "#FF9800", // Orange
      KOT_and_save: "#000000", // Black
      has_save: "#4CAF50", // Green
      settle: "#87CEEB", // Sky blue
      reserve_table: "#808080", // Grey
      cancel: "#F44336", // Red
    };
    return colors[type] || "blue.400";
  };

  const fetchLatestSettings = useCallback(async (showToast = false) => {
    try {
      if (!refreshing) {
        setIsLoading(true);
      }
      
      const outlet_id = await AsyncStorage.getItem("outlet_id");
      const device_token = await AsyncStorage.getItem("device_token");
      
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
            has_save: Boolean(data.has_save),
            settle: Boolean(data.settle),
            reserve_table: Boolean(data.reserve_table),
            cancel: Boolean(data.cancel),
          }
        };

        setSettings(newSettings);
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
              has_save: Boolean(parsedSettings.has_save),
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

  // Handle app state change
  const handleAppStateChange = useCallback((nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      fetchLatestSettings(false);
    }
    setAppState(nextAppState);
  }, [appState, fetchLatestSettings]);

  useEffect(() => {
    fetchLatestSettings(false);
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [fetchLatestSettings, handleAppStateChange]);

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLatestSettings(true);
  }, [fetchLatestSettings]);

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

  const updateSetting = async (type, value) => {
    setLoadingSettings(prev => ({ ...prev, [type]: true }));
    
    try {
      const outlet_id = await AsyncStorage.getItem("outlet_id");
      const user_id = await AsyncStorage.getItem("captain_id");
      
      const updatedSettings = { ...settings };
      
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
      } else if (type === 'print_and_save' || type === 'KOT_and_save' || type === 'has_save' || 
                type === 'settle' || type === 'reserve_table' || type === 'cancel') {
        updatedSettings.orderManagement[type] = Boolean(value);
      } else if (type === 'theme' || type === 'style') {
        updatedSettings[type] = value;
      }
      
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
        toast.show({
          description: "Setting updated successfully",
          status: "success",
          placement: "bottom",
          duration: 2000
        });
      } else {
        // Revert change on failure
        const revertedSettings = { ...settings };
        if (type === 'has_dine_in') {
          revertedSettings.orderTypes.dine_in = !Boolean(value);
        } else if (type === 'has_parcel') {
          revertedSettings.orderTypes.parcel = !Boolean(value);
        } else if (type === 'has_counter') {
          revertedSettings.orderTypes.counter = !Boolean(value);
        } else if (type === 'has_delivery') {
          revertedSettings.orderTypes.delivery = !Boolean(value);
        } else if (type === 'has_drive_through') {
          revertedSettings.orderTypes.driveThrough = !Boolean(value);
        } else if (type === 'POS_show_menu_image') {
          revertedSettings.showMenuImages = !Boolean(value);
        } else if (type === 'print_and_save' || type === 'KOT_and_save' || type === 'has_save' || 
                  type === 'settle' || type === 'reserve_table' || type === 'cancel') {
          revertedSettings.orderManagement[type] = !Boolean(value);
        }
        
        setSettings(revertedSettings);
        
        toast.show({
          description: "Failed to update setting",
          status: "error",
          placement: "bottom",
          duration: 2000
        });
      }
    } catch (error) {
      toast.show({
        description: "Error updating setting",
        status: "error",
        placement: "bottom",
        duration: 2000
      });
    } finally {
      setLoadingSettings(prev => ({ ...prev, [type]: false }));
    }
  };

  // Event handlers
  const handleThemeChange = (value) => updateSetting("theme", value);
  const handleStyleChange = (value) => updateSetting("style", value);
  const handleOrderTypeToggle = (type) => {
    const apiType = type === 'driveThrough' ? 'has_drive_through' : `has_${type}`;
    updateSetting(apiType, !settings.orderTypes[type]);
  };
  const handleOrderManagementToggle = (feature) => {
    updateSetting(feature, !settings.orderManagement[feature]);
  };
  const handlePrinterPress = () => router.push("/profile/PrinterManagement");

  // UI Components
  const SettingItem = ({ 
    icon, 
    title, 
    type,
    value, 
    onPress, 
    showChevron = false, 
    isLast = false,
    isDropdown = false,
    options = [],
    onSelect
  }) => {
    const isToggleValue = typeof value === "boolean" || value === 0 || value === 1;
    const boolValue = isToggleValue ? Boolean(value) : false;
    
    // Toggle color configuration based on type
    const getItemConfig = () => {
      // Default
      let config = {
        bg: "white",
        borderColor: "transparent",
        iconColor: "coolGray.500"
      };
      
      if (!isToggleValue || !boolValue) return config;
      
      // Color mappings for each toggle type
      const typeConfigs = {
        has_dine_in: {
          bg: "#e3f2fd", // Light blue for Dine In
          borderColor: "#2196F3",
          iconColor: "#2196F3"
        },
        has_parcel: {
          bg: "#FFF3E0", // Light orange for Parcel
          borderColor: "#FF9800", 
          iconColor: "#FF9800"
        },
        has_counter: {
          bg: "#E8F5E9", // Light green for Counter
          borderColor: "#4CAF50",
          iconColor: "#4CAF50"
        },
        has_delivery: {
          bg: "#E3F2FD", // Light blue for Delivery
          borderColor: "#2196F3",
          iconColor: "#2196F3"
        },
        has_drive_through: {
          bg: "#F3E5F5", // Light purple for Drive Through
          borderColor: "#9C27B0",
          iconColor: "#9C27B0"
        },
        print_and_save: {
          bg: "#FFF3E0", // Light orange for Print & Save
          borderColor: "#FF9800",
          iconColor: "#FF9800"
        },
        KOT_and_save: {
          bg: "#E0E0E0", // Light gray for KOT & Save
          borderColor: "#000000",
          iconColor: "#000000"
        },
        has_save: {
          bg: "#E8F5E9", // Light green for Save
          borderColor: "#4CAF50",
          iconColor: "#4CAF50"
        },
        settle: {
          bg: "#E1F5FE", // Very light blue for Settle
          borderColor: "#87CEEB",
          iconColor: "#87CEEB"
        },
        reserve_table: {
          bg: "#F5F5F5", // Light gray for Reserve Table
          borderColor: "#808080",
          iconColor: "#808080"
        },
        cancel: {
          bg: "#FFEBEE", // Light red for Cancel Order
          borderColor: "#F44336",
          iconColor: "#F44336"
        },
        POS_show_menu_image: {
          bg: "white", // Plain white for Menu Images
          borderColor: "#666666",
          iconColor: "#666666"
        }
      };
      
      return typeConfigs[type] || config;
    };
    
    const config = getItemConfig();
    
    // Get track color for the toggle switch
    const getTrackColor = () => {
      if (!boolValue) return "#E0E0E0";
      
      const colors = {
        has_dine_in: "#2196F3", // Blue
        has_parcel: "#FF9800", // Orange
        has_counter: "#4CAF50", // Green
        has_delivery: "#2196F3", // Blue
        has_drive_through: "#9C27B0", // Purple
        print_and_save: "#FF9800", // Orange
        KOT_and_save: "#000000", // Black
        has_save: "#4CAF50", // Green
        settle: "#87CEEB", // Sky blue
        reserve_table: "#808080", // Grey
        cancel: "#F44336", // Red
        POS_show_menu_image: "#666666" // Dark grey
      };
      
      return colors[type] || "blue.400";
    };
    
    return (
      <Box
        bg={boolValue && isToggleValue ? config.bg : "white"}
        borderLeftWidth={4}
        borderLeftColor={boolValue && isToggleValue ? config.borderColor : "transparent"}
        borderRadius="md"
        shadow={1}
        mx={2}
        mb={2}
        overflow="hidden"
      >
        <Pressable
          onPress={onPress}
          android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          _pressed={{ opacity: 0.8 }}
        >
          <HStack 
            py={3.5} 
            px={3}
            justifyContent="space-between" 
            alignItems="center"
          >
            <HStack space={3} alignItems="center" flex={1}>
              <Icon 
                as={MaterialIcons} 
                name={icon} 
                size={5} 
                color={boolValue && isToggleValue ? config.iconColor : "coolGray.500"} 
              />
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                {title}
              </Text>
            </HStack>
            
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
                  />
                ))}
              </Select>
            ) : (
              <>
                {typeof value === "string" && (
                  <Text fontSize="sm" color={mutedTextColor}>
                    {value}
                  </Text>
                )}
                {isToggleValue && (
                  <Switch
                    size="md"
                    isChecked={boolValue}
                    onToggle={onPress}
                    trackColor={{
                      false: "#E0E0E0",
                      true: getTrackColor()
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings[type]}
                  />
                )}
                {showChevron && (
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
        </Pressable>
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box flex={1} bg="coolGray.50" justifyContent="center" alignItems="center">
        <Spinner size="lg" color="blue.500" />
        <Text mt={4} color="coolGray.500">Loading settings...</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.50" safeArea>
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
            <Icon as={MaterialIcons} name="refresh" size={4} color="white" />
          </HStack>
        </Pressable>
      </HStack>

      <ScrollView 
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
            tintColor="#2196F3"
          />
        }
      >
        {/* Printer Section */}
        <Box bg={bgColor} rounded="xl" shadow={1} mx={4} my={4}>
          <Pressable onPress={handlePrinterPress} _pressed={{ opacity: 0.7 }}>
            <HStack space={4} p={4} alignItems="center">
              <Box position="relative" bg={isPrinterConnected ? "green.100" : "coolGray.100"} p={3} rounded="full">
                <Icon
                  as={MaterialIcons}
                  name="print"
                  size={6}
                  color={isPrinterConnected ? "green.600" : "coolGray.500"}
                />
                {isPrinterConnected && (
                  <Box position="absolute" top={0} right={0} bg="green.500" size={2} rounded="full" borderWidth={1} borderColor="white" />
                )}
              </Box>
              <VStack flex={1}>
                <Text fontSize="md" fontWeight="semibold" color={isPrinterConnected ? "green.600" : textColor}>
                  {isPrinterConnected ? "Printer Connected" : "Printer Not Connected"}
                </Text>
                <Text fontSize="sm" color={mutedTextColor}>
                  {isPrinterConnected
                    ? `Connected to: ${printerDevice?.name || "Unknown Printer"}`
                    : "Tap to connect a printer"}
                </Text>
              </VStack>
              <Icon as={MaterialIcons} name="chevron-right" size={6} color="coolGray.400" />
            </HStack>
          </Pressable>
        </Box>

        {/* Appearance - Just the label */}
        <HStack space={3} p={4} alignItems="center" mx={4} mb={2} mt={4}>
          <Box bg="#E1F5FE" p={2} rounded="lg">
            <Icon as={MaterialIcons} name="palette" size={6} color="#2196F3" />
          </Box>
          <VStack>
            <Text fontSize="md" fontWeight="semibold" color={textColor}>Appearance</Text>
            <Text fontSize="xs" color={mutedTextColor}>
              Customize your app's look and feel
            </Text>
          </VStack>
        </HStack>

        {/* Theme without container */}
        <Box mx={4} mb={4}>
          <Box 
            bg="#E1F5FE" 
            borderLeftWidth={4}
            borderLeftColor="#2196F3"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <HStack 
              py={3.5} 
              px={4}
              justifyContent="space-between" 
              alignItems="center"
            >
              <HStack space={3} alignItems="center" flex={1}>
                <Icon 
                  as={MaterialIcons} 
                  name="brightness-6" 
                  size={5} 
                  color="#2196F3" 
                />
                <Text fontSize="md" color={textColor}>
                  Theme
                </Text>
              </HStack>
              
              <Select
                selectedValue={settings.theme}
                minWidth="120"
                accessibilityLabel="Theme"
                placeholder="Theme"
                onValueChange={handleThemeChange}
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
                <Select.Item label="System" value="system" />
                <Select.Item label="Light" value="light" />
                <Select.Item label="Dark" value="dark" />
              </Select>
            </HStack>
          </Box>
        </Box>

        {/* Order Types - Just the label */}
        <HStack space={3} p={4} alignItems="center" mx={4} mb={2}>
          <Box bg="#F3E5F5" p={2} rounded="lg">
            <Icon as={MaterialIcons} name="shopping-bag" size={6} color="#9C27B0" />
          </Box>
          <VStack>
            <Text fontSize="md" fontWeight="semibold" color={textColor}>Order Types</Text>
            <Text fontSize="xs" color={mutedTextColor}>
              Manage available order options
            </Text>
          </VStack>
        </HStack>

        {/* Order Type options without container */}
        <Box mx={4} mb={4}>
          {/* Dine In with blue background */}
          <Box 
            bg="#E3F2FD" 
            borderLeftWidth={4}
            borderLeftColor="#2196F3"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <Pressable
              onPress={() => handleOrderTypeToggle('dine_in')}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="restaurant" 
                    size={5} 
                    color="#2196F3" 
                  />
                  <Text fontSize="md" color={textColor}>
                    Dine In
                  </Text>
                </HStack>
                
                {loadingSettings['has_dine_in'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.orderTypes.dine_in}
                    onToggle={() => handleOrderTypeToggle('dine_in')}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#2196F3"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['has_dine_in']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
          
          {/* Parcel with orange background */}
          <Box 
            bg="#FFF3E0" 
            borderLeftWidth={4}
            borderLeftColor="#FF9800"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <Pressable
              onPress={() => handleOrderTypeToggle('parcel')}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="local-shipping" 
                    size={5} 
                    color="#FF9800" 
                  />
                  <Text fontSize="md" color={textColor}>
                    Parcel
                  </Text>
                </HStack>
                
                {loadingSettings['has_parcel'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.orderTypes.parcel}
                    onToggle={() => handleOrderTypeToggle('parcel')}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#FF9800"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['has_parcel']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
          
          {/* Counter with green background */}
          <Box 
            bg="#E8F5E9" 
            borderLeftWidth={4}
            borderLeftColor="#4CAF50"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <Pressable
              onPress={() => handleOrderTypeToggle('counter')}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="point-of-sale" 
                    size={5} 
                    color="#4CAF50" 
                  />
                  <Text fontSize="md" color={textColor}>
                    Counter
                  </Text>
                </HStack>
                
                {loadingSettings['has_counter'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.orderTypes.counter}
                    onToggle={() => handleOrderTypeToggle('counter')}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#4CAF50"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['has_counter']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
          
          {/* Delivery with blue background */}
          <Box 
            bg="#E3F2FD" 
            borderLeftWidth={4}
            borderLeftColor="#2196F3"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <Pressable
              onPress={() => handleOrderTypeToggle('delivery')}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="delivery-dining" 
                    size={5} 
                    color="#2196F3" 
                  />
                  <Text fontSize="md" color={textColor}>
                    Delivery
                  </Text>
                </HStack>
                
                {loadingSettings['has_delivery'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.orderTypes.delivery}
                    onToggle={() => handleOrderTypeToggle('delivery')}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#2196F3"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['has_delivery']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
          
          {/* Drive Through with purple background */}
          <Box 
            bg="#F3E5F5" 
            borderLeftWidth={4}
            borderLeftColor="#9C27B0"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <Pressable
              onPress={() => handleOrderTypeToggle('driveThrough')}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="drive-eta" 
                    size={5} 
                    color="#9C27B0" 
                  />
                  <Text fontSize="md" color={textColor}>
                    Drive Through
                  </Text>
                </HStack>
                
                {loadingSettings['has_drive_through'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.orderTypes.driveThrough}
                    onToggle={() => handleOrderTypeToggle('driveThrough')}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#9C27B0"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['has_drive_through']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
        </Box>

        {/* Menu Settings - Just the label with no container */}
        <HStack space={3} p={4} alignItems="center" mx={4} mb={2} mt={2}>
          <Box bg="#E8F5E9" p={2} rounded="lg">
            <Icon as={MaterialIcons} name="restaurant-menu" size={6} color="#4CAF50" />
          </Box>
          <VStack>
            <Text fontSize="md" fontWeight="semibold" color={textColor}>Menu Settings</Text>
            <Text fontSize="xs" color={mutedTextColor}>
              Configure menu display options
            </Text>
          </VStack>
        </HStack>

        {/* Show Menu Images without container */}
        <Box mx={4} mb={4}>
          <Box 
            bg="white" 
            borderLeftWidth={4}
            borderLeftColor="#666666"
            rounded="lg"
            shadow={1}
            overflow="hidden"
          >
            <Pressable
              onPress={() => updateSetting('POS_show_menu_image', !settings.showMenuImages)}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="image" 
                    size={5} 
                    color="coolGray.500" 
                  />
                  <Text fontSize="md" color={textColor}>
                    Show Menu Images
                  </Text>
                </HStack>
                
                {loadingSettings['POS_show_menu_image'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.showMenuImages}
                    onToggle={() => updateSetting('POS_show_menu_image', !settings.showMenuImages)}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#666666"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['POS_show_menu_image']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
        </Box>

        {/* Order Management - Just the label */}
        <HStack space={3} p={4} alignItems="center" mx={4} mb={2}>
          <Box bg="#FFF3E0" p={2} rounded="lg">
            <Icon as={MaterialIcons} name="settings" size={6} color="#FF9800" />
          </Box>
          <VStack>
            <Text fontSize="md" fontWeight="semibold" color={textColor}>Order Management</Text>
            <Text fontSize="xs" color={mutedTextColor}>
              Configure order processing options
            </Text>
          </VStack>
        </HStack>

        {/* Order Management items without container */}
        <Box mx={4} mb={4}>
          {/* Print & Save with orange background */}
          <Box 
            bg="#FFF3E0" 
            borderLeftWidth={4}
            borderLeftColor="#FF9800"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <Pressable
              onPress={() => handleOrderManagementToggle('print_and_save')}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="print" 
                    size={5} 
                    color="#FF9800" 
                  />
                  <Text fontSize="md" color={textColor}>
                    Print & Save
                  </Text>
                </HStack>
                
                {loadingSettings['print_and_save'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.orderManagement.print_and_save}
                    onToggle={() => handleOrderManagementToggle('print_and_save')}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#FF9800"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['print_and_save']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
          
          {/* KOT & Save with black background */}
          <Box 
            bg="#E0E0E0" 
            borderLeftWidth={4}
            borderLeftColor="#000000"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <Pressable
              onPress={() => handleOrderManagementToggle('KOT_and_save')}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="receipt-long" 
                    size={5} 
                    color="#000000" 
                  />
                  <Text fontSize="md" color={textColor}>
                    KOT & Save
                  </Text>
                </HStack>
                
                {loadingSettings['KOT_and_save'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.orderManagement.KOT_and_save}
                    onToggle={() => handleOrderManagementToggle('KOT_and_save')}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#000000"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['KOT_and_save']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
          
          {/* Save with green background */}
          <Box 
            bg="#E8F5E9" 
            borderLeftWidth={4}
            borderLeftColor="#4CAF50"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <Pressable
              onPress={() => handleOrderManagementToggle('has_save')}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="save" 
                    size={5} 
                    color="#4CAF50" 
                  />
                  <Text fontSize="md" color={textColor}>
                    Save
                  </Text>
                </HStack>
                
                {loadingSettings['has_save'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.orderManagement.has_save}
                    onToggle={() => handleOrderManagementToggle('has_save')}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#4CAF50"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['has_save']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
          
          {/* Settle with sky blue background */}
          <Box 
            bg="#E1F5FE" 
            borderLeftWidth={4}
            borderLeftColor="#87CEEB"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <Pressable
              onPress={() => handleOrderManagementToggle('settle')}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="check-circle" 
                    size={5} 
                    color="#87CEEB" 
                  />
                  <Text fontSize="md" color={textColor}>
                    Settle
                  </Text>
                </HStack>
                
                {loadingSettings['settle'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.orderManagement.settle}
                    onToggle={() => handleOrderManagementToggle('settle')}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#87CEEB"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['settle']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
          
          {/* Reserve Table with grey background */}
          <Box 
            bg="#F5F5F5" 
            borderLeftWidth={4}
            borderLeftColor="#808080"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <Pressable
              onPress={() => handleOrderManagementToggle('reserve_table')}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="event-seat" 
                    size={5} 
                    color="#808080" 
                  />
                  <Text fontSize="md" color={textColor}>
                    Reserve Table
                  </Text>
                </HStack>
                
                {loadingSettings['reserve_table'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.orderManagement.reserve_table}
                    onToggle={() => handleOrderManagementToggle('reserve_table')}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#808080"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['reserve_table']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
          
          {/* Cancel Order with red background */}
          <Box 
            bg="#FFEBEE" 
            borderLeftWidth={4}
            borderLeftColor="#F44336"
            rounded="lg"
            mb={2}
            overflow="hidden"
          >
            <Pressable
              onPress={() => handleOrderManagementToggle('cancel')}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              _pressed={{ opacity: 0.8 }}
            >
              <HStack 
                py={3.5} 
                px={4}
                justifyContent="space-between" 
                alignItems="center"
              >
                <HStack space={3} alignItems="center" flex={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="cancel" 
                    size={5} 
                    color="#F44336" 
                  />
                  <Text fontSize="md" color={textColor}>
                    Cancel Order
                  </Text>
                </HStack>
                
                {loadingSettings['cancel'] ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <Switch
                    size="md"
                    isChecked={settings.orderManagement.cancel}
                    onToggle={() => handleOrderManagementToggle('cancel')}
                    trackColor={{
                      false: "#E0E0E0",
                      true: "#F44336"
                    }}
                    thumbColor="white"
                    isDisabled={loadingSettings['cancel']}
                  />
                )}
              </HStack>
            </Pressable>
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
} 