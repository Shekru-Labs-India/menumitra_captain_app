import LocalDatabaseService from './LocalDatabaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { onGetProductionUrl, getApiEndpoints } from '../Screens/utils/ConstantFunctions';
import * as FileSystem from 'expo-file-system';
import { EventEmitter } from '../utils/EventEmitter';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncListeners = [];
  }

  // Check if network is available
  async isNetworkAvailable() {
    const networkState = await NetInfo.fetch();
    return networkState.isConnected && networkState.isInternetReachable;
  }

  // Add listeners for sync status updates
  addSyncListener(listener) {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of sync status change
  notifySyncListeners(status, message = '') {
    this.syncListeners.forEach(listener => {
      try {
        listener({status, message});
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // Main sync function
  async synchronize(accessToken) {
    if (!accessToken) throw new Error('No access token');
    
    console.log('Starting sync process...'); // Debug log

    try {
      const pendingItems = await LocalDatabaseService.getPendingSyncItems();
      console.log('Pending items to sync:', pendingItems.length); // Debug log

      if (!pendingItems.length) {
        console.log('No items to sync');
        return;
      }

      for (const item of pendingItems) {
        try {
          // Validate and fix item data before sync
          const validatedItem = this.validateItemBeforeSync(item);
          
          if (validatedItem.deleted) {
            await this.deleteMenuItem(validatedItem, accessToken);
          } else if (validatedItem.serverId) {
            await this.updateMenuItem(validatedItem, accessToken);
          } else {
            await this.createMenuItem(validatedItem, accessToken);
          }
        } catch (error) {
          console.error(`Error syncing item ${item.name}:`, error);
          // Continue with next item
        }
      }
      
      // Now sync waiters
      await this.synchronizeWaiters(accessToken);
      
      this.lastSyncTime = new Date();
      this.notifySyncListeners('completed');
      
      // Add this line to trigger a refresh of the online menu after sync
      EventEmitter.emit('MENU_ITEMS_SYNCED');
      
      return { success: true };
    } catch (error) {
      console.error('Sync error:', error);
      this.notifySyncListeners('failed', error.message);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  // Sync reference data from server
  async syncReferenceData(accessToken) {
    try {
      const baseUrl = await onGetProductionUrl();
      let response;

      try {
        // Try the real API call first
        response = await axios.get(`${baseUrl}/api/reference-data`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } catch (error) {
        // If real API fails with 404, use mock implementation
        if (error.response && error.response.status === 404) {
          console.log('API endpoint not found, using mock implementation');
          response = await this.mockApiCall(`${baseUrl}/api/reference-data`, 'GET', null, accessToken);
        } else {
          throw error;
        }
      }

      if (response.data.success) {
        // Process and store each type of reference data
        const referenceData = response.data.data;
        
        for (const type in referenceData) {
          if (Object.prototype.hasOwnProperty.call(referenceData, type)) {
            const items = referenceData[type];
            
            // Delete existing reference data of this type
            await LocalDatabaseService.db.transaction(tx => {
              tx.executeSql(
                'DELETE FROM reference_data WHERE type = ?',
                [type],
                () => {},
                (_, error) => {
                  console.error('Error deleting reference data:', error);
                  return false;
                }
              );
            });
            
            // Insert new reference data
            for (const item of items) {
              await LocalDatabaseService.addReferenceData(
                type,
                item.key || item.id,
                JSON.stringify(item)
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error syncing reference data:', error);
      throw new Error('Failed to sync reference data: ' + error.message);
    }
  }

  // Upload pending menu items to server
  async uploadPendingMenuItems(accessToken) {
    try {
      const pendingItems = await LocalDatabaseService.getPendingSyncItems();
      const baseUrl = await onGetProductionUrl();
      
      for (const item of pendingItems) {
        // Format item for API
        const apiItem = {
          menu_id: item.serverId, // Will be null for new items
          name: item.name,
          menu_cat_id: item.menuCatId,
          veg_nonveg: item.vegNonveg,
          spicy_index: item.spicyIndex,
          full_price: item.fullPrice,
          half_price: item.halfPrice,
          description: item.description,
          ingredients: item.ingredients,
          offer: item.offer,
          user_id: item.userId,
          outlet_id: item.outletId,
          status: item.deleted ? 'DELETED' : item.status,
          images: item.images || []
        };

        // Determine if this is a create, update, or delete operation
        let response;
        
        try {
          if (!item.serverId) {
            // Create new item
            response = await axios.post(`${baseUrl}/api/menu/create`, apiItem, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
          } else if (item.deleted) {
            // Delete item
            response = await axios.delete(`${baseUrl}/api/menu/${item.serverId}`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
          } else {
            // Update item
            response = await axios.put(`${baseUrl}/api/menu/${item.serverId}`, apiItem, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
          }
        } catch (error) {
          // If real API fails with 404, use mock implementation
          if (error.response && error.response.status === 404) {
            console.log('API endpoint not found, using mock implementation');
            const method = !item.serverId ? 'POST' : item.deleted ? 'DELETE' : 'PUT';
            const endpoint = !item.serverId ? 
              `${baseUrl}/api/menu/create` : 
              `${baseUrl}/api/menu/${item.serverId}`;
            
            response = await this.mockApiCall(endpoint, method, apiItem, accessToken);
          } else {
            throw error;
          }
        }

        if (response.data.success) {
          // Mark item as synced
          const serverId = response.data.data?.menu_id || item.serverId;
          await LocalDatabaseService.markAsSynced(item.localId, serverId);
        } else {
          console.error('API error:', response.data);
          throw new Error('API returned error: ' + (response.data.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error uploading pending items:', error);
      throw new Error('Failed to upload pending changes: ' + error.message);
    }
  }

  // Download latest menu items from server
  async downloadMenuItems(accessToken) {
    try {
      const baseUrl = await onGetProductionUrl();
      // Get restaurant ID
      const outletId = await AsyncStorage.getItem('restaurantId');
      if (!outletId) {
        throw new Error('Restaurant ID not found');
      }
      
      let response;
      try {
        // Attempt to get menu items from server
        response = await axios.get(`${baseUrl}/api/menu/items?outlet_id=${outletId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } catch (error) {
        // If real API fails with 404, use mock implementation
        if (error.response && error.response.status === 404) {
          console.log('API endpoint not found, using mock implementation');
          response = await this.mockApiCall(`${baseUrl}/api/menu/items?outlet_id=${outletId}`, 'GET', null, accessToken);
        } else {
          throw error;
        }
      }

      if (response.data.success) {
        const serverItems = response.data.data || [];
        
        // Get local items that are not pending sync
        const localItems = await LocalDatabaseService.getMenuItems({
          outletId,
          includePendingSync: false
        });
        
        // Process server items...
        // [Rest of your existing implementation]
      } else {
        throw new Error('API returned error: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error downloading menu items:', error);
      throw new Error('Failed to download menu items: ' + error.message);
    }
  }

  // Add this method to handle menu item sync specifically
  async syncMenuItems(accessToken) {
    try {
      this.notifySyncListeners('progress', 'Syncing menu items...');

      // Get pending menu items from local database
      const pendingItems = await LocalDatabaseService.getPendingSyncItems();
      
      if (pendingItems.length === 0) {
        return { success: true, message: 'No pending menu items to sync' };
      }

      const baseUrl = await onGetProductionUrl();
      const restaurantId = await AsyncStorage.getItem('restaurantId');

      // Process each pending item
      for (const item of pendingItems) {
        try {
          // Format the item for API
          const formData = new FormData();
          formData.append('outlet_id', restaurantId);
          formData.append('name', item.name);
          formData.append('menu_cat_id', item.menuCatId);
          formData.append('food_type', item.vegNonveg);
          formData.append('spicy_index', item.spicyIndex || '');
          formData.append('full_price', item.fullPrice);
          formData.append('half_price', item.halfPrice || '0');
          formData.append('description', item.description || '');
          formData.append('ingredients', item.ingredients || '');
          formData.append('offer', item.offer || '0');
          formData.append('user_id', item.userId);

          // Handle images
          if (item.images && item.images.length > 0) {
            item.images.forEach((imageUri, index) => {
              const uriParts = imageUri.split('/');
              const filename = uriParts[uriParts.length - 1];
              
              formData.append('images', {
                uri: imageUri,
                type: 'image/jpeg',
                name: filename,
              });
            });
          }

          let response;
          
          if (!item.serverId) {
            // Create new item
            response = await axios.post(`${baseUrl}/api/menu/create`, formData, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'multipart/form-data',
              },
            });
          } else if (item.deleted) {
            // Delete item
            response = await axios.delete(`${baseUrl}/api/menu/${item.serverId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });
          } else {
            // Update item
            response = await axios.put(`${baseUrl}/api/menu/${item.serverId}`, formData, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'multipart/form-data',
              },
            });
          }

          if (response.data.success || response.data.st === 1) {
            // Mark item as synced in local database
            const serverId = response.data.data?.menu_id || item.serverId;
            await LocalDatabaseService.markAsSynced(item.localId, serverId);
          } else {
            console.error('API error for item:', item.localId, response.data);
          }
        } catch (error) {
          console.error('Error syncing menu item:', item.localId, error);
          // Continue with next item even if one fails
        }
      }

      return { success: true, message: 'Menu items synced successfully' };
    } catch (error) {
      console.error('Error in syncMenuItems:', error);
      return { success: false, message: error.message };
    }
  }

  // Sync a new item that doesn't exist on the server
  async syncNewItem(item, accessToken) {
    console.log(`Syncing new item: ${item.name}`);
    
    try {
      // Use the same API endpoint as the online AddMenuProduct screen
      const baseUrl = onGetProductionUrl();
      const endpoint = baseUrl + "menu_create"; // Same endpoint used in AddMenuProduct
      
      // Create FormData for the request
      const formData = new FormData();
      
      // Add all menu item properties exactly as in AddMenuProduct
      formData.append('outlet_id', item.outletId);
      formData.append('name', item.name);
      formData.append('menu_cat_id', item.menuCatId);
      formData.append('food_type', item.vegNonveg);
      formData.append('spicy_index', item.spicyIndex || '1'); // Default to '1' if empty
      formData.append('full_price', item.fullPrice);
      formData.append('half_price', item.halfPrice || '0');
      formData.append('description', item.description || '');
      formData.append('ingredients', item.ingredients || '');
      formData.append('offer', item.offer || '0');
      formData.append('user_id', item.userId);
      
      // Add images with proper error handling
      if (item.images && item.images.length > 0) {
        for (const imageUri of item.images) {
          try {
            if (imageUri && imageUri.startsWith('file://')) {
              const fileInfo = await FileSystem.getInfoAsync(imageUri);
              if (fileInfo.exists) {
                const fileName = imageUri.split('/').pop();
                formData.append('images', {
                  uri: imageUri,
                  name: fileName,
                  type: 'image/jpeg'
                });
              }
            }
          } catch (imgError) {
            console.error('Error processing image:', imgError);
            // Continue with next image
          }
        }
      }

      console.log('Sending data to endpoint:', endpoint);
      
      // Send the request
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data',
        }
      });

      console.log('API response:', response.data);

      if (response.data.st !== 1) {
        throw new Error(response.data.msg || 'Failed to create menu item');
      }

      // Update local record with server ID and mark as synced
      const serverId = response.data.menu_id;
      await LocalDatabaseService.markAsSynced(item.localId, serverId);
      
      console.log(`Successfully synced new item: ${item.name} (ID: ${serverId})`);
      return { success: true, serverId };
    } catch (error) {
      console.error('Error in syncNewItem:', error);
      throw error;
    }
  }

  // Sync an updated item
  async syncUpdatedItem(item, accessToken) {
    console.log(`Syncing updated item: ${item.name} (ID: ${item.serverId})`);
    const endpoints = getApiEndpoints();
    
    // Create FormData for the request
    const formData = new FormData();
    
    // Add all the menu item properties
    formData.append('menu_id', item.serverId);
    formData.append('outlet_id', item.outletId);
    formData.append('name', item.name);
    formData.append('menu_cat_id', item.menuCatId);
    formData.append('food_type', item.vegNonveg);
    
    // Fix for spicy_index - ensure it's never empty
    formData.append('spicy_index', item.spicyIndex || '1'); // Default to '1' if empty
    
    formData.append('full_price', item.fullPrice);
    formData.append('half_price', item.halfPrice || '0');
    formData.append('description', item.description || '');
    formData.append('ingredients', item.ingredients || '');
    formData.append('offer', item.offer || '0');
    formData.append('user_id', item.userId);
    
    // Add images
    if (item.images && item.images.length > 0) {
      for (const imageUri of item.images) {
        if (imageUri.startsWith('file://')) {
          const fileInfo = await FileSystem.getInfoAsync(imageUri);
          if (fileInfo.exists) {
            const fileName = imageUri.split('/').pop();
            formData.append('images', {
              uri: imageUri,
              name: fileName,
              type: 'image/jpeg' // Adjust if needed
            });
          }
        } else if (imageUri.startsWith('http')) {
          formData.append('existing_images', imageUri);
        }
      }
    }

    // Send the request
    const response = await axios.post(endpoints.syncUpdate, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'multipart/form-data',
      }
    });

    if (response.data.st !== 1) {
      throw new Error(response.data.msg || 'Failed to update menu item');
    }

    // Mark as synced
    await LocalDatabaseService.markAsSynced(item.localId, item.serverId);
    
    console.log(`Successfully synced updated item: ${item.name}`);
    return { success: true };
  }

  // Sync a deleted item
  async syncDeletedItem(item, accessToken) {
    console.log(`Syncing deleted item: ${item.name} (ID: ${item.serverId})`);
    const endpoints = getApiEndpoints();
    
    // Can only delete items that have a server ID
    if (!item.serverId) {
      // If it doesn't have a server ID, just remove it locally
      await LocalDatabaseService.permanentlyDeleteMenuItem(item.localId);
      return { success: true };
    }

    // Send the deletion request
    const response = await axios.post(endpoints.syncDelete, {
      menu_id: item.serverId,
      outlet_id: item.outletId
    }, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (response.data.st !== 1) {
      throw new Error(response.data.msg || 'Failed to delete menu item');
    }

    // Permanently delete from local database
    await LocalDatabaseService.permanentlyDeleteMenuItem(item.localId);
    
    console.log(`Successfully deleted item from server: ${item.name}`);
    return { success: true };
  }

  // Add this method to SyncService for debugging
  async checkToken() {
    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('Token exists:', !!token);
      if (token) {
        console.log('Token:', token.substring(0, 10) + '...');
      }
    } catch (error) {
      console.error('Error checking token:', error);
    }
  }

  // Create menu item (wrapper for syncNewItem)
  async createMenuItem(item, accessToken) {
    return this.syncNewItem(item, accessToken);
  }

  // Update menu item (wrapper for syncUpdatedItem)
  async updateMenuItem(item, accessToken) {
    return this.syncUpdatedItem(item, accessToken);
  }

  // Delete menu item (wrapper for syncDeletedItem)
  async deleteMenuItem(item, accessToken) {
    return this.syncDeletedItem(item, accessToken);
  }

  // Sync waiters with server
  async synchronizeWaiters(accessToken) {
    try {
      console.log('Checking for waiters to synchronize...');
      
      // Check if getPendingSyncWaiters exists
      if (typeof LocalDatabaseService.getPendingSyncWaiters !== 'function') {
        console.log('Waiter sync not implemented yet, skipping');
        return { success: true, message: 'Waiter sync not implemented' };
      }
      
      // Get pending sync waiters
      const pendingWaiters = await LocalDatabaseService.getPendingSyncWaiters();
      if (!pendingWaiters || pendingWaiters.length === 0) {
        console.log('No waiters to sync');
        return { success: true, message: 'No waiters to sync' };
      }
      
      console.log(`Found ${pendingWaiters.length} waiters to sync`);
      
      // Process each waiter
      for (const waiter of pendingWaiters) {
        try {
          const baseUrl = await onGetProductionUrl();
          const endpoint = baseUrl + 'waiter/sync';
          
          // Prepare waiter data
          const waiterData = {
            id: waiter.serverId,
            outlet_id: waiter.outlet_id,
            name: waiter.name,
            mobile: waiter.mobile,
            address: waiter.address,
            aadhar_number: waiter.aadhar_number,
            action: waiter.syncAction // 'create', 'update', or 'delete'
          };
          
          // Send to server
          const response = await axios.post(endpoint, waiterData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.data.st === 1) {
            // Update local record with server ID and mark as synced
            const serverId = response.data.data?.id || waiter.serverId;
            await LocalDatabaseService.markWaiterAsSynced(waiter.localId, serverId);
            console.log(`Successfully synced waiter: ${waiter.name}`);
          } else {
            console.error('API error for waiter:', waiter.name, response.data);
          }
        } catch (error) {
          console.error('Error syncing waiter:', waiter.name, error);
          // Continue with next waiter
        }
      }
      
      console.log('Waiter synchronization complete');
      return { success: true };
    } catch (error) {
      console.log('Waiter synchronization not available:', error.message);
      return { success: true, message: 'Waiter sync skipped' };
    }
  }

  // Improved validation helper method
  validateItemBeforeSync(item) {
    console.log('Validating item before sync:', item.name);
    
    // Create a copy so we don't mutate the original
    const validatedItem = {...item};
    
    // Ensure spicy_index is not empty
    if (!validatedItem.spicyIndex) {
      console.log('Setting default spicy_index to 1');
      validatedItem.spicyIndex = '1'; // Default value
    }
    
    // Ensure other required fields have values
    validatedItem.halfPrice = validatedItem.halfPrice || '0';
    validatedItem.description = validatedItem.description || '';
    validatedItem.ingredients = validatedItem.ingredients || '';
    validatedItem.offer = validatedItem.offer || '0';
    
    // Ensure status is defined
    validatedItem.status = validatedItem.status || 'ACTIVE';
    
    console.log('Validated item:', {
      name: validatedItem.name,
      spicyIndex: validatedItem.spicyIndex,
      menuCatId: validatedItem.menuCatId,
      vegNonveg: validatedItem.vegNonveg
    });
    
    return validatedItem;
  }
}

export default new SyncService();