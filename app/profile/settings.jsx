import { useState, useEffect } from "react";
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
} from "native-base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorMode } from "native-base";
import { getBaseUrl } from "../../config/api.config";
import { fetchWithAuth } from "../../utils/apiInterceptor";
import { usePrinter } from "../../context/PrinterContext";

export default function SettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colorMode, toggleColorMode } = useColorMode();
  const [isLoading, setIsLoading] = useState(true);
  
  // Replace local printer states with context values
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

  const fetchDefaultSettings = async (showToast = false) => {
    try {
      setIsLoading(true);
      const outlet_id = await AsyncStorage.getItem("outlet_id");
      const storedSettings = await AsyncStorage.getItem("app_settings");

      // If this is just a regular component load (not a reset), and we have stored settings
      // then use the stored settings and don't fetch from server
      if (!showToast && storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({
          theme: parsedSettings.theme ,
          style: parsedSettings.style ,
          showMenuImages: parsedSettings.POS_show_menu_image,
          orderTypes: {
            dine_in: parsedSettings.has_dine_in,
            parcel: parsedSettings.has_parcel,
            counter: parsedSettings.has_counter,
            delivery: parsedSettings.has_delivery,
            driveThrough: parsedSettings.has_drive_through,
          },
          orderManagement: {
            print_and_save: parsedSettings.print_and_save,
            KOT_and_save: parsedSettings.KOT_and_save,
            settle: parsedSettings.settle,
            reserve_table: parsedSettings.reserve_table,
            cancel: parsedSettings.cancel,
          }
        });
        setIsLoading(false);
        return;
      }

      // Only fetch from server if we're resetting settings or don't have stored settings
      const response = await fetchWithAuth(`${getBaseUrl()}/default_settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_id: outlet_id  })
      });

      if (response.st === 1 && response.data) {
        const data = response.data;
        const newSettings = {
          theme: data.theme,
          style: data.style,
          showMenuImages: data.POS_show_menu_image,
          orderTypes: {
            dine_in: data.has_dine_in,
            parcel: data.has_parcel,
            counter: data.has_counter,
            delivery: data.has_delivery,
            driveThrough: data.has_drive_through,
          },
          orderManagement: {
            print_and_save: data.print_and_save,
            KOT_and_save: data.KOT_and_save,
            settle: data.settle,
            reserve_table: data.reserve_table,
            cancel: data.cancel,
          }
        };

        setSettings(newSettings);
        // Update stored settings
        await AsyncStorage.setItem("app_settings", JSON.stringify(data));

        if (showToast) {
          toast.show({
            description: response.msg || "Default settings applied successfully",
            status: "success",
            placement: "bottom",
            duration: 2000
          });
        }
      } else {
        toast.show({
          description: response.msg || "Failed to load settings",
          status: "error",
          placement: "bottom",
          duration: 2000
        });
      }
    } catch (error) {
      toast.show({
        description: "Error loading settings",
        status: "error",
        placement: "bottom",
        duration: 2000  
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaultSettings(false);
  }, []);

  const updateSetting = async (type, value) => {
    try {
      const outlet_id = await AsyncStorage.getItem("outlet_id");
      
      const response = await fetchWithAuth(`${getBaseUrl()}/change_settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outlet_id || "13",
          type: type,
          value: value
        })
      });

      if (response.st === 1) {
        const data = response.data;
        // Update local state
        setSettings({
          theme: data.theme,
          style: data.style,
          showMenuImages: data.POS_show_menu_image,
          orderTypes: {
            dine_in: data.has_dine_in,
            parcel: data.has_parcel,
            counter: data.has_counter,
            delivery: data.has_delivery,
            driveThrough: data.has_drive_through,
          },
          orderManagement: {
            print_and_save: data.print_and_save,
            KOT_and_save: data.KOT_and_save,
            settle: data.settle,
            reserve_table: data.reserve_table,
            cancel: data.cancel,
          }
        });

        // Update stored settings
        await AsyncStorage.setItem("app_settings", JSON.stringify(data));

        toast.show({
          description: response.msg || "Settings updated successfully",
          status: "success",
          placement: "bottom",
          duration: 2000
        });
      } else {
        toast.show({
          description: response.msg || "Failed to update setting",
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

  // Settings section component with icon
  const SettingsSection = ({ title, description, icon, iconColor = "blue.400", children }) => (
    <Box bg="white" rounded="xl" shadow={1} mx={4} mb={4} overflow="hidden">
      <VStack>
        <HStack space={3} p={4} alignItems="center" bg="coolGray.50">
          <Box bg={iconColor} p={2} rounded="lg" opacity={0.2}>
            <Icon 
              as={MaterialIcons} 
              name={icon} 
              size={6} 
              color={iconColor.replace('.400', '.700')} 
            />
          </Box>
          <VStack>
            <Heading size="sm">{title}</Heading>
            {description && (
              <Text fontSize="xs" color="coolGray.500" mt={0.5}>
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
    onSelect
  }) => (
    <Pressable onPress={onPress}>
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
          <Text fontSize="sm" color="coolGray.600">
            {title}
          </Text>
        </HStack>
        <HStack space={2} alignItems="center">
          {isDropdown ? (
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
              {typeof value === "string" && !isDropdown && (
                <Text fontSize="sm" color="coolGray.400">
                  {value}
                </Text>
              )}
              {typeof value === "boolean" && (
                <Switch
                  size="md"
                  isChecked={value}
                  onToggle={onPress}
                  colorScheme="blue"
                  _track={{
                    bg: value ? "blue.400" : "coolGray.200",
                  }}
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

  if (isLoading) {
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
        bg="white"
        shadow={1}
      >
        <IconButton
          icon={<MaterialIcons name="arrow-back" size={24} color="gray" />}
          onPress={() => router.back()}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
        />
        <Heading size="md" flex={1} textAlign="center">
          Settings
        </Heading>
        <Pressable 
          onPress={() => fetchDefaultSettings(true)}
          flexDirection="row"
          alignItems="center"
          px={3}
          py={2}
          rounded="full"
          _pressed={{ bg: "coolGray.100" }}
        >
          <Text color="blue.500" mr={1} fontWeight="medium">
            Reset
          </Text>
          <Icon 
            as={MaterialIcons} 
            name="refresh" 
            size={6} 
            color="blue.500" 
            mr={1}
          />
        </Pressable>
      </HStack>

      <ScrollView showsVerticalScrollIndicator={false} _contentContainerStyle={{ py: 4 }}>
        {/* Printer Section */}
        <Pressable onPress={handlePrinterPress}>
          <Box bg="white" rounded="xl" shadow={1} mx={4} mb={4} overflow="hidden">
            <HStack space={3} p={4} alignItems="center">
              <Box position="relative">
                <Icon
                  as={MaterialIcons}
                  name="print"
                  size={7}
                  color={isPrinterConnected ? "green.600" : "coolGray.500"}
                />
                {isPrinterConnected && (
                  <Box
                    position="absolute"
                    bottom={0}
                    right={0}
                    w={2}
                    h={2}
                    bg="green.500"
                    rounded="full"
                    borderWidth={2}
                    borderColor="white"
                  />
                )}
              </Box>
              <VStack flex={1}>
                <Text fontSize="sm" fontWeight="medium" color="coolGray.800">
                  {isPrinterConnected ? "Printer Connected" : "Printer Not Connected"}
                </Text>
                <Text fontSize="xs" color="coolGray.500">
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
            options={[
              { label: "Blue", value: "blue" },
              { label: "Green", value: "green" },
              { label: "Red", value: "red" },
              { label: "Orange", value: "orange" },
              { label: "Gold", value: "gold" }

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
            icon="local-shipping"
            title="Parcel"
            value={settings.orderTypes.parcel}
            onPress={() => handleOrderTypeToggle('parcel')}
            showChevron={false}
          />
          <SettingItem
            icon="point-of-sale"
            title="Counter"
            value={settings.orderTypes.counter}
            onPress={() => handleOrderTypeToggle('counter')}
            showChevron={false}
          />
          <SettingItem
            icon="delivery-dining"
            title="Delivery"
            value={settings.orderTypes.delivery}
            onPress={() => handleOrderTypeToggle('delivery')}
            showChevron={false}
          />
          <SettingItem
            icon="drive-eta"
            title="Drive Through"
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
            value={settings.orderManagement.print_and_save}
            onPress={() => handleOrderManagementToggle('print_and_save')}
            showChevron={false}
          />
          <SettingItem
            icon="receipt-long"
            title="KOT & Save"
            value={settings.orderManagement.KOT_and_save}
            onPress={() => handleOrderManagementToggle('KOT_and_save')}
            showChevron={false}
          />
          <SettingItem
            icon="check-circle"
            title="Settle"
            value={settings.orderManagement.settle}
            onPress={() => handleOrderManagementToggle('settle')}
            showChevron={false}
          />
          <SettingItem
            icon="event-seat"
            title="Reserve Table"
            value={settings.orderManagement.reserve_table}
            onPress={() => handleOrderManagementToggle('reserve_table')}
            showChevron={false}
          />
          <SettingItem
            icon="cancel"
            title="Cancel Order"
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