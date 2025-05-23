import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Searchbar, FAB, Card, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRestaurantId } from '../../utils/getOwnerData';
import SyncStatusBar from '../../../components/SyncStatusBar';
import LocalDatabaseService from '../../../services/LocalDatabaseService';
import { useOffline } from '../../../providers/OfflineProvider';
import CustomTabBar from '../../CustomTabBar';
import NetInfo from '@react-native-community/netinfo';
import SyncService from '../../../services/SyncService';

export default function OfflineMenuListScreen() {
  const navigation = useNavigation();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [showSyncButton, setShowSyncButton] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Get offline context
  const { isOnline, synchronize, pendingChanges, syncStatus } = useOffline();
  
  // Check network status and pending sync items
  const checkSyncStatus = useCallback(async () => {
    try {
      // Check network connection
      const networkState = await NetInfo.fetch();
      setIsConnected(networkState.isConnected && networkState.isInternetReachable);

      // Get pending sync count
      const count = await LocalDatabaseService.getPendingSyncCount();
      setPendingSyncCount(count);

      // Show sync button if online and there are pending items
      setShowSyncButton(networkState.isConnected && networkState.isInternetReachable && count > 0);
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  }, []);

  // Add network state listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected && state.isInternetReachable);
      checkSyncStatus(); // Recheck sync status when network state changes
    });

    return () => unsubscribe();
  }, []);

  // Check sync status periodically and when screen focuses
  useFocusEffect(
    useCallback(() => {
      checkSyncStatus();
      const interval = setInterval(checkSyncStatus, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }, [])
  );
  
  // Reload data when screen comes into focus or when refresh parameter changes
  useFocusEffect(
    useCallback(() => {
      loadRestaurantId();
      loadCategories();
      
      const refresh = navigation.getState().routes[navigation.getState().index].params?.refresh || false;
      const timestamp = navigation.getState().routes[navigation.getState().index].params?.timestamp || 0;
      
      if (refresh) {
        loadMenuItems();
      }
    }, [navigation.getState().routes, navigation.getState().index, navigation.getState().params?.refresh, navigation.getState().params?.timestamp])
  );
  
  // Load initial data
  useEffect(() => {
    loadRestaurantId();
    loadCategories();
    loadMenuItems();
  }, []);
  
  // Load restaurant ID from storage
  const loadRestaurantId = async () => {
    try {
      const id = await getRestaurantId();
      setRestaurantId(id);
    } catch (error) {
      console.error('Error loading restaurant ID:', error);
    }
  };
  
  // Load menu categories
  const loadCategories = async () => {
    try {
      await LocalDatabaseService.ensureInitialized();
      const cats = await LocalDatabaseService.getReferenceDatas({ type: 'CATEGORY' });
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };
  
  // Load menu items
  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const restaurantId = await getRestaurantId();
      
      // Get all menu items including pending sync items
      const items = await LocalDatabaseService.getMenuItems({
        outletId: restaurantId,
        includeDeleted: false
      });
      
      console.log('Loaded menu items:', items); // Debug log
      
      // Apply category filter if selected
      let filteredItems = items;
      if (selectedCategory) {
        filteredItems = items.filter(item => item.menuCatId === selectedCategory);
      }
      
      // Apply search filter if needed
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredItems = filteredItems.filter(item => 
          (item.name && item.name.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query))
        );
      }
      
      setMenuItems(filteredItems);
    } catch (error) {
      console.error('Error loading menu items:', error);
      Alert.alert('Error', 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle search
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    
    // Apply search filter
    if (menuItems.length > 0) {
      if (query.trim()) {
        const filtered = menuItems.filter(item => 
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
        );
        setMenuItems(filtered);
      } else {
        // Reload all items if search is cleared
        loadMenuItems();
      }
    }
  };
  
  // Handle category filter
  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    setTimeout(() => {
      loadMenuItems();
    }, 100);
  };
  
  // Handle edit menu item
  const handleEditItem = (item) => {
    navigation.navigate('OfflineAddMenuProduct', { itemToEdit: item });
  };
  
  // Handle delete menu item
  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Menu Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Soft delete - marks as deleted and pending sync
              await LocalDatabaseService.deleteMenuItem(item.localId);
              Alert.alert('Success', 'Menu item deleted');
              loadMenuItems();
            } catch (error) {
              console.error('Error deleting menu item:', error);
              Alert.alert('Error', 'Failed to delete menu item');
            }
          }
        }
      ]
    );
  };
  
  // Modify handleSync to remove token handling
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const accessToken = await AsyncStorage.getItem("access_token");
      await SyncService.synchronize(accessToken);
      
      // Refresh items after sync
      await loadMenuItems();
      Alert.alert('Success', 'Menu items synced successfully');
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', 'Failed to sync menu items');
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Get category name
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.key === categoryId);
    return category ? category.value : 'Uncategorized';
  };
  
  // Render menu item card
  const renderMenuItemCard = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.imageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image 
              source={{ uri: item.images[0] }} 
              style={styles.menuImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="restaurant" size={32} color="#ccc" />
            </View>
          )}
        </View>
        
        <View style={styles.detailsContainer}>
          <Text style={styles.itemName}>{item.name}</Text>
          
          <View style={styles.tagsContainer}>
            <Chip 
              style={styles.categoryChip} 
              textStyle={styles.chipText}
              icon={() => <Icon name="category" size={16} color="#757575" />}
            >
              {getCategoryName(item.menuCatId)}
            </Chip>
            
            <Chip 
              style={[
                styles.vegChip, 
                { backgroundColor: item.vegNonveg === 'VEG' ? '#E8F5E9' : '#FFEBEE' }
              ]} 
              textStyle={{ 
                color: item.vegNonveg === 'VEG' ? '#2E7D32' : '#C62828',
                fontSize: 12
              }}
            >
              {item.vegNonveg === 'VEG' ? 'Veg' : 'Non-Veg'}
            </Chip>
          </View>
          
          <Text style={styles.price}>
            ₹{item.fullPrice}
            {item.halfPrice ? ` / Half: ₹${item.halfPrice}` : ''}
          </Text>
          
          {item.pendingSync && (
            <Chip 
              style={styles.pendingChip}
              textStyle={styles.pendingChipText}
              icon={() => <Icon name="sync" size={14} color="#FF9800" />}
            >
              Pending Sync
            </Chip>
          )}
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditItem(item)}
          >
            <Icon name="edit" size={22} color="#2196F3" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteItem(item)}
          >
            <Icon name="delete" size={22} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
  
  const testDatabase = async () => {
    try {
      const result = await LocalDatabaseService.testDatabaseConnection();
      Alert.alert(
        'Database Test', 
        `Success: ${result.success}\nUsing Fallback: ${result.usingFallback}\nCategories: ${result.categories.length}`
      );
    } catch (error) {
      Alert.alert('Database Test Failed', error.message);
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Show sync status bar */}
      {pendingSyncCount > 0 && (
        <SyncStatusBar 
          isOnline={isConnected}
          pendingChanges={pendingSyncCount}
          syncStatus={syncStatus}
          onSyncPress={handleSync}
        />
      )}
      
      {/* Search Bar */}
      <Searchbar
        placeholder="Search menu items"
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {/* Category Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={item => item.key}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Chip
              selected={selectedCategory === item.key}
              selectedColor="#2196F3"
              style={[
                styles.filterChip,
                selectedCategory === item.key && styles.selectedFilterChip
              ]}
              textStyle={[
                styles.filterChipText,
                selectedCategory === item.key && styles.selectedFilterChipText
              ]}
              onPress={() => handleCategoryFilter(item.key)}
            >
              {item.value}
            </Chip>
          )}
        />
      </View>
      
      {/* Menu Items List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loaderText}>Loading menu items...</Text>
        </View>
      ) : menuItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="restaurant-menu" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No menu items found</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button below to add your first menu item
          </Text>
        </View>
      ) : (
        <FlatList
          data={menuItems}
          keyExtractor={item => item.localId}
          renderItem={renderMenuItemCard}
          contentContainerStyle={styles.listContainer}
        />
      )}
      
      {/* FAB to add new menu item */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('OfflineAddMenuProduct')}
      />
      
      {/* Show sync button if there are pending changes and we're online */}
      {showSyncButton && (
        <FAB
          style={[styles.fab, styles.syncFab]}
          icon="sync"
          label={`Sync (${pendingSyncCount})`}
          onPress={handleSync}
        />
      )}
      
      {/* Tab Bar */}
      <CustomTabBar navigation={navigation} />
      
      <TouchableOpacity 
        style={styles.testButton}
        onPress={testDatabase}
      >
        <Text style={styles.testButtonText}>Test Database</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 10,
    elevation: 2,
  },
  filtersContainer: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#ECEFF1',
  },
  selectedFilterChip: {
    backgroundColor: '#E3F2FD',
  },
  filterChipText: {
    color: '#607D8B',
  },
  selectedFilterChipText: {
    color: '#2196F3',
  },
  listContainer: {
    padding: 10,
    paddingBottom: 100, // Space for FAB and tab bar
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  menuImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  categoryChip: {
    backgroundColor: '#F5F5F5',
    height: 24,
    marginRight: 8,
  },
  vegChip: {
    height: 24,
  },
  chipText: {
    fontSize: 12,
    color: '#757575',
  },
  price: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
    marginLeft: 8,
  },
  pendingChip: {
    backgroundColor: '#FFF3E0',
    alignSelf: 'flex-start',
    marginTop: 8,
    height: 24,
  },
  pendingChipText: {
    color: '#FF9800',
    fontSize: 12,
  },
  actionsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  actionButton: {
    padding: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginTop: 12,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 60, // Above the tab bar
    backgroundColor: '#2196F3',
  },
  testButton: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 100, // Below the tab bar
    backgroundColor: '#2196F3',
    padding: 12,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  syncFab: {
    bottom: 120, // Position above the add button
    backgroundColor: '#4CAF50',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
}); 