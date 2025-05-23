import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import axios from 'axios';
import {
  onGetProductionUrl,
  onGetOwnerUrl,
} from "../Screens/utils/ConstantFunctions";


// Define schemas
const MenuItemSchema = {
  name: 'MenuItem',
  primaryKey: 'localId',
  properties: {
    localId: 'string', // Local UUID
    serverId: 'string?', // ID from server, null if not synced
    name: 'string',
    menuCatId: 'string',
    vegNonveg: 'string',
    spicyIndex: 'string?',
    fullPrice: 'string',
    halfPrice: 'string?',
    description: 'string?',
    ingredients: 'string?',
    offer: 'string?',
    userId: 'string',
    outletId: 'string',
    status: 'string',
    createdAt: 'date',
    updatedAt: 'date',
    images: 'string[]', // Array of base64 image strings
    pendingSync: 'bool', // true if needs to be synced
    deleted: 'bool' // for soft delete
  }
};

// Schema for cached dropdown lists
const ReferenceDataSchema = {
  name: 'ReferenceData',
  primaryKey: 'id',
  properties: {
    id: 'string', // Type_Key format, e.g., "CATEGORY_1"
    type: 'string', // E.g., "CATEGORY", "VEG_NONVEG", etc.
    key: 'string',
    value: 'string',
    lastUpdated: 'date'
  }
};

class LocalDatabaseService {
  constructor() {
    this.db = null;
    this.useInMemoryFallback = false;
    this.inMemoryDB = {
      menuItems: [],
      menuImages: [],
      referenceData: []
    };
    this.initPromise = this.initDatabase();
  }

  async initDatabase() {
    if (Platform.OS === 'web' || Constants.appOwnership === 'expo') {
      // Use AsyncStorage fallback for Expo Go
      console.log('Using AsyncStorage fallback for Expo Go');
      this.useInMemoryFallback = true;
      await this.initializeReferenceData();
      return;
    }

    try {
      if (Platform.OS === 'web') {
        console.log('SQLite is not supported on web. Using in-memory fallback.');
        this.useInMemoryFallback = true;
        await this.initializeReferenceData();
        return;
      }

      // Use openDatabaseAsync instead of openDatabase for Expo Go
      try {
        this.db = await SQLite.openDatabaseAsync('menumitra.db');
      } catch (error) {
        console.error('Error opening database with openDatabaseAsync:', error);
        // Fallback to older method if needed
        try {
          this.db = SQLite.openDatabase('menumitra.db');
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          this.useInMemoryFallback = true;
          await this.initializeReferenceData();
          return;
        }
      }

      // Initialize tables
      await this.createTables();
      await this.initializeReferenceData();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      this.useInMemoryFallback = true;
      await this.initializeReferenceData();
    }
  }

  // Wait for database initialization before any operation
  async ensureInitialized() {
    await this.initPromise;
  }

  async createTables() {
    try {
      // Create menu_items table with fields matching API response
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS menu_items (
          localId TEXT PRIMARY KEY,
          serverId TEXT,
          name TEXT NOT NULL,
          menuCatId TEXT NOT NULL,
          vegNonveg TEXT NOT NULL,
          spicyIndex TEXT,
          fullPrice TEXT NOT NULL,
          halfPrice TEXT,
          description TEXT,
          ingredients TEXT,
          offer TEXT,
          userId TEXT NOT NULL,
          outletId TEXT NOT NULL,
          status TEXT DEFAULT '1',
          createdAt TEXT,
          updatedAt TEXT,
          pendingSync INTEGER DEFAULT 1,
          syncAction TEXT DEFAULT 'create',
          deleted INTEGER DEFAULT 0
        )
      `);
      
      // Create menu_images table
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS menu_images (
          id TEXT PRIMARY KEY,
          menuItemId TEXT NOT NULL,
          imageUri TEXT NOT NULL,
          FOREIGN KEY (menuItemId) REFERENCES menu_items (localId)
        )
      `);
      
      // Create categories cache table
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS menu_categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          status TEXT,
          lastUpdated TEXT
        )
      `);
      
      // Create reference_data table
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS reference_data (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          lastUpdated TEXT
        )
      `);
      
      console.log('Tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  // Menu Items CRUD operations
  async addMenuItem(item) {
    await this.ensureInitialized();
    
    try {
      const localId = this.generateUUID();
      const timestamp = new Date().toISOString();
      
      const menuItem = {
        ...item,
        localId,
        serverId: null,
        pendingSync: true,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      if (this.useInMemoryFallback) {
        this.inMemoryDB.menuItems.push(menuItem);
        return { success: true, localId };
      }

      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          tx.executeSql(
            `INSERT INTO menu_items (
              local_id, name, menu_cat_id, veg_nonveg,
              spicy_index, full_price, half_price,
              description, ingredients, offer,
              user_id, outlet_id, status,
              created_at, updated_at, pending_sync
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              localId, item.name, item.menuCatId, item.vegNonveg,
              item.spicyIndex, item.fullPrice, item.halfPrice,
              item.description, item.ingredients, item.offer,
              item.userId, item.outletId, item.status,
              timestamp, timestamp, 1
            ],
            (_, result) => {
              resolve({ success: true, localId });
            },
            (_, error) => {
              console.error('Error adding menu item:', error);
              reject(error);
              return false;
            }
          );
        });
      });
    } catch (error) {
      console.error('Error in addMenuItem:', error);
      throw error;
    }
  }

  async getMenuItem(localId) {
    await this.ensureInitialized();
    
    try {
      if (this.useInMemoryFallback) {
        return this.inMemoryGetMenuItem(localId);
      }
      
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          // Get menu item
          tx.executeSql(
            `SELECT * FROM menu_items WHERE local_id = ?`,
            [localId],
            (_, { rows }) => {
              if (rows.length === 0) {
                resolve(null);
                return;
              }
              
              const menuItem = this.formatMenuItemFromDatabase(rows.item(0));
              
              // Get images for this menu item
              tx.executeSql(
                `SELECT * FROM menu_images WHERE menu_item_id = ?`,
                [localId],
                (_, { rows: imageRows }) => {
                  menuItem.images = [];
                  for (let i = 0; i < imageRows.length; i++) {
                    menuItem.images.push(imageRows.item(i).image_uri);
                  }
                  resolve(menuItem);
                },
                (_, error) => {
                  console.error('Error getting images', error);
                  reject(error);
                  return false;
                }
              );
            },
            (_, error) => {
              console.error('Error getting menu item', error);
              reject(error);
              return false;
            }
          );
        }, error => {
          console.error('Transaction error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in getMenuItem:', error);
      throw error;
    }
  }

  async getMenuItems(filters = {}) {
    await this.ensureInitialized();
    
    try {
      if (this.useInMemoryFallback) {
        return this.inMemoryGetMenuItems(filters);
      }
      
      let whereConditions = [];
      let params = [];
      
      // Add filter conditions
      if (filters.outletId) {
        whereConditions.push('outlet_id = ?');
        params.push(filters.outletId);
      }
      
      if (filters.menuCatId) {
        whereConditions.push('menu_cat_id = ?');
        params.push(filters.menuCatId);
      }
      
      if (filters.includePendingSync === false) {
        whereConditions.push('pending_sync = 0');
      }
      
      if (filters.includeDeleted === false) {
        whereConditions.push('deleted = 0');
      }
      
      if (filters.status) {
        whereConditions.push('status = ?');
        params.push(filters.status);
      }
      
      let whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      return new Promise((resolve, reject) => {
        const menuItems = [];
        const menuItemsMap = new Map();
        
        this.db.transaction(tx => {
          // Get menu items
          tx.executeSql(
            `SELECT * FROM menu_items ${whereClause} ORDER BY updated_at DESC`,
            params,
            (_, { rows }) => {
              // Process each menu item
              for (let i = 0; i < rows.length; i++) {
                const item = this.formatMenuItemFromDatabase(rows.item(i));
                item.images = [];
                menuItems.push(item);
                menuItemsMap.set(item.localId, item);
              }
              
              // Get all images for these menu items
              const localIds = menuItems.map(item => item.localId);
              if (localIds.length === 0) {
                resolve(menuItems);
                return;
              }
              
              // Create placeholders for SQL IN clause
              const placeholders = localIds.map(() => '?').join(',');
              
              tx.executeSql(
                `SELECT * FROM menu_images WHERE menu_item_id IN (${placeholders})`,
                localIds,
                (_, { rows: imageRows }) => {
                  // Attach images to their menu items
                  for (let i = 0; i < imageRows.length; i++) {
                    const imageRow = imageRows.item(i);
                    const menuItem = menuItemsMap.get(imageRow.menu_item_id);
                    if (menuItem) {
                      menuItem.images.push(imageRow.image_uri);
                    }
                  }
                  
                  resolve(menuItems);
                },
                (_, error) => {
                  console.error('Error getting images', error);
                  // Still resolve with menu items even if images fail
                  resolve(menuItems);
                  return false;
                }
              );
            },
            (_, error) => {
              console.error('Error getting menu items', error);
              reject(error);
              return false;
            }
          );
        }, error => {
          console.error('Transaction error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in getMenuItems:', error);
      throw error;
    }
  }

  async updateMenuItem(localId, menuItemData) {
    await this.ensureInitialized();
    
    try {
      const now = new Date().toISOString();
      
      if (this.useInMemoryFallback) {
        // Update in memory
        const index = this.inMemoryDB.menuItems.findIndex(item => item.localId === localId);
        if (index === -1) {
          throw new Error(`Menu item with ID ${localId} not found`);
        }
        
        // Mark as needing sync unless specifically told not to
        const pendingSync = menuItemData.pendingSync !== false;
        
        const updatedItem = {
          ...this.inMemoryDB.menuItems[index],
          name: menuItemData.name || this.inMemoryDB.menuItems[index].name,
          menuCatId: menuItemData.menuCatId || this.inMemoryDB.menuItems[index].menuCatId,
          vegNonveg: menuItemData.vegNonveg || this.inMemoryDB.menuItems[index].vegNonveg,
          spicyIndex: menuItemData.spicyIndex !== undefined ? menuItemData.spicyIndex : this.inMemoryDB.menuItems[index].spicyIndex,
          fullPrice: menuItemData.fullPrice || this.inMemoryDB.menuItems[index].fullPrice,
          halfPrice: menuItemData.halfPrice !== undefined ? menuItemData.halfPrice : this.inMemoryDB.menuItems[index].halfPrice,
          description: menuItemData.description !== undefined ? menuItemData.description : this.inMemoryDB.menuItems[index].description,
          ingredients: menuItemData.ingredients !== undefined ? menuItemData.ingredients : this.inMemoryDB.menuItems[index].ingredients,
          offer: menuItemData.offer !== undefined ? menuItemData.offer : this.inMemoryDB.menuItems[index].offer,
          status: menuItemData.status || this.inMemoryDB.menuItems[index].status,
          updatedAt: now,
          pendingSync: pendingSync,
          deleted: menuItemData.deleted || this.inMemoryDB.menuItems[index].deleted
        };
        
        this.inMemoryDB.menuItems[index] = updatedItem;
        
        // Update images if provided
        if (menuItemData.images) {
          // Remove old images
          this.inMemoryDB.menuImages = this.inMemoryDB.menuImages.filter(img => img.menuItemId !== localId);
          
          // Add new images
          menuItemData.images.forEach(imageUri => {
            const imageId = this.generateUUID();
            this.inMemoryDB.menuImages.push({
              id: imageId,
              menuItemId: localId,
              imageUri: imageUri
            });
          });
          
          updatedItem.images = [...menuItemData.images];
        }
        
        await AsyncStorage.setItem('menuItems', JSON.stringify(this.inMemoryDB.menuItems));
        
        return { success: true };
      }
      
      // Use SQLite
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          // Mark as needing sync unless specifically told not to
          const pendingSync = menuItemData.pendingSync !== false ? 1 : 0;
          
          const updateFields = [];
          const updateValues = [];
          
          if (menuItemData.name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(menuItemData.name);
          }
          
          if (menuItemData.menuCatId !== undefined) {
            updateFields.push('menu_cat_id = ?');
            updateValues.push(menuItemData.menuCatId);
          }
          
          if (menuItemData.vegNonveg !== undefined) {
            updateFields.push('veg_nonveg = ?');
            updateValues.push(menuItemData.vegNonveg);
          }
          
          if (menuItemData.spicyIndex !== undefined) {
            updateFields.push('spicy_index = ?');
            updateValues.push(menuItemData.spicyIndex);
          }
          
          if (menuItemData.fullPrice !== undefined) {
            updateFields.push('full_price = ?');
            updateValues.push(menuItemData.fullPrice);
          }
          
          if (menuItemData.halfPrice !== undefined) {
            updateFields.push('half_price = ?');
            updateValues.push(menuItemData.halfPrice);
          }
          
          if (menuItemData.description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(menuItemData.description);
          }
          
          if (menuItemData.ingredients !== undefined) {
            updateFields.push('ingredients = ?');
            updateValues.push(menuItemData.ingredients);
          }
          
          if (menuItemData.offer !== undefined) {
            updateFields.push('offer = ?');
            updateValues.push(menuItemData.offer);
          }
          
          if (menuItemData.status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(menuItemData.status);
          }
          
          if (menuItemData.deleted !== undefined) {
            updateFields.push('deleted = ?');
            updateValues.push(menuItemData.deleted ? 1 : 0);
          }
          
          // Always update these fields
          updateFields.push('updated_at = ?');
          updateValues.push(now);
          
          updateFields.push('pending_sync = ?');
          updateValues.push(pendingSync);
          
          // Add localId to the update values array
          updateValues.push(localId);
          
          // Update the menu item
          tx.executeSql(
            `UPDATE menu_items SET ${updateFields.join(', ')} WHERE local_id = ?`,
            updateValues,
            () => {
              // Update images if provided
              if (menuItemData.images !== undefined) {
                // Delete old images
                tx.executeSql(
                  `DELETE FROM menu_images WHERE menu_item_id = ?`,
                  [localId],
                  () => {
                    // Insert new images
                    if (menuItemData.images && menuItemData.images.length > 0) {
                      menuItemData.images.forEach(imageUri => {
                        const imageId = this.generateUUID();
                        tx.executeSql(
                          `INSERT INTO menu_images (id, menu_item_id, image_uri) VALUES (?, ?, ?)`,
                          [imageId, localId, imageUri],
                          null,
                          (_, error) => {
                            console.error('Error inserting image', error);
                            return false;
                          }
                        );
                      });
                    }
                  },
                  (_, error) => {
                    console.error('Error deleting old images', error);
                    return false;
                  }
                );
              }
              
              resolve({ success: true });
            },
            (_, error) => {
              console.error('Error updating menu item', error);
              reject(error);
              return false;
            }
          );
        }, error => {
          console.error('Transaction error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in updateMenuItem:', error);
      throw error;
    }
  }

  async deleteMenuItem(localId) {
    await this.ensureInitialized();
    
    try {
      if (this.useInMemoryFallback) {
        // Check if item exists
        const index = this.inMemoryDB.menuItems.findIndex(item => item.localId === localId);
        if (index === -1) {
          throw new Error(`Menu item with ID ${localId} not found`);
        }
        
        // For items that have never been synced (no serverId), we can hard delete
        if (!this.inMemoryDB.menuItems[index].serverId) {
          this.inMemoryDB.menuItems = this.inMemoryDB.menuItems.filter(item => item.localId !== localId);
          this.inMemoryDB.menuImages = this.inMemoryDB.menuImages.filter(img => img.menuItemId !== localId);
        } else {
          // Soft delete for items that exist on the server
          this.inMemoryDB.menuItems[index] = {
            ...this.inMemoryDB.menuItems[index],
            deleted: true,
            pendingSync: true,
            updatedAt: new Date().toISOString()
          };
        }
        
        await AsyncStorage.setItem('menuItems', JSON.stringify(this.inMemoryDB.menuItems));
        
        return { success: true };
      }
      
      // Use SQLite
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          // Check if item has a server_id
          tx.executeSql(
            `SELECT server_id FROM menu_items WHERE local_id = ?`,
            [localId],
            (_, { rows }) => {
              if (rows.length === 0) {
                reject(new Error(`Menu item with ID ${localId} not found`));
                return;
              }
              
              const menuItem = rows.item(0);
              
              if (!menuItem.server_id) {
                // Hard delete for items that have never been synced
                tx.executeSql(
                  `DELETE FROM menu_images WHERE menu_item_id = ?`,
                  [localId],
                  () => {
                    tx.executeSql(
                      `DELETE FROM menu_items WHERE local_id = ?`,
                      [localId],
                      () => resolve({ success: true }),
                      (_, error) => {
                        console.error('Error deleting menu item', error);
                        reject(error);
                        return false;
                      }
                    );
                  },
                  (_, error) => {
                    console.error('Error deleting images', error);
                    reject(error);
                    return false;
                  }
                );
              } else {
                // Soft delete for items that exist on the server
                const now = new Date().toISOString();
                tx.executeSql(
                  `UPDATE menu_items SET deleted = 1, pending_sync = 1, updated_at = ? WHERE local_id = ?`,
                  [now, localId],
                  () => resolve({ success: true }),
                  (_, error) => {
                    console.error('Error soft-deleting menu item', error);
                    reject(error);
                    return false;
                  }
                );
              }
            },
            (_, error) => {
              console.error('Error checking menu item', error);
              reject(error);
              return false;
            }
          );
        }, error => {
          console.error('Transaction error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in deleteMenuItem:', error);
      throw error;
    }
  }

  async getPendingSyncItems() {
    await this.ensureInitialized();
    
    try {
      if (this.useInMemoryFallback) {
        return this.inMemoryGetPendingSyncItems();
      }
      
      return new Promise((resolve, reject) => {
        const pendingItems = [];
        const menuItemsMap = new Map();
        
        this.db.transaction(tx => {
          tx.executeSql(
            `SELECT * FROM menu_items WHERE pending_sync = 1`,
            [],
            (_, { rows }) => {
              // Process each menu item
              for (let i = 0; i < rows.length; i++) {
                const item = this.formatMenuItemFromDatabase(rows.item(i));
                item.images = [];
                pendingItems.push(item);
                menuItemsMap.set(item.localId, item);
              }
              
              // Get all images for these menu items
              const localIds = pendingItems.map(item => item.localId);
              if (localIds.length === 0) {
                resolve(pendingItems);
                return;
              }
              
              // Create placeholders for SQL IN clause
              const placeholders = localIds.map(() => '?').join(',');
              
              tx.executeSql(
                `SELECT * FROM menu_images WHERE menu_item_id IN (${placeholders})`,
                localIds,
                (_, { rows: imageRows }) => {
                  // Attach images to their menu items
                  for (let i = 0; i < imageRows.length; i++) {
                    const imageRow = imageRows.item(i);
                    const menuItem = menuItemsMap.get(imageRow.menu_item_id);
                    if (menuItem) {
                      menuItem.images.push(imageRow.image_uri);
                    }
                  }
                  
                  resolve(pendingItems);
                },
                (_, error) => {
                  console.error('Error getting images', error);
                  // Still resolve with menu items even if images fail
                  resolve(pendingItems);
                  return false;
                }
              );
            },
            (_, error) => {
              console.error('Error getting pending items', error);
              reject(error);
              return false;
            }
          );
        }, error => {
          console.error('Transaction error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in getPendingSyncItems:', error);
      throw error;
    }
  }

  async markAsSynced(localId, serverId) {
    await this.ensureInitialized();
    
    try {
      if (this.useInMemoryFallback) {
        return this.inMemoryMarkAsSynced(localId, serverId);
      }
      
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          tx.executeSql(
            `UPDATE menu_items 
             SET server_id = ?, pending_sync = 0, updated_at = ? 
             WHERE local_id = ?`,
            [serverId, new Date().toISOString(), localId],
            (_, result) => {
              if (result.rowsAffected > 0) {
                resolve({ success: true });
              } else {
                reject(new Error(`No menu item found with ID ${localId}`));
              }
            },
            (_, error) => {
              console.error('Error marking item as synced:', error);
              reject(error);
              return false;
            }
          );
        });
      });
    } catch (error) {
      console.error('Error in markAsSynced:', error);
      throw error;
    }
  }

  // Reference Data methods
  async addReferenceData(type, key, value) {
    await this.ensureInitialized();
    
    try {
      const now = new Date().toISOString();
      const id = `${type}_${key}`;
      
      if (this.useInMemoryFallback) {
        // Check if exists
        const index = this.inMemoryDB.referenceData.findIndex(item => item.id === id);
        
        if (index !== -1) {
          // Update
          this.inMemoryDB.referenceData[index] = {
            id,
            type,
            key,
            value,
            lastUpdated: now
          };
        } else {
          // Insert
          this.inMemoryDB.referenceData.push({
            id,
            type,
            key,
            value,
            lastUpdated: now
          });
        }
        
        await AsyncStorage.setItem('referenceData', JSON.stringify(this.inMemoryDB.referenceData));
        
        return { success: true };
      }
      
      // Use SQLite
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          // Check if exists
          tx.executeSql(
            `SELECT * FROM reference_data WHERE id = ?`,
            [id],
            (_, { rows }) => {
              if (rows.length > 0) {
                // Update
                tx.executeSql(
                  `UPDATE reference_data SET value = ?, last_updated = ? WHERE id = ?`,
                  [value, now, id],
                  () => resolve({ success: true }),
                  (_, error) => {
                    console.error('Error updating reference data', error);
                    reject(error);
                    return false;
                  }
                );
              } else {
                // Insert
                tx.executeSql(
                  `INSERT INTO reference_data (id, type, key, value, last_updated) VALUES (?, ?, ?, ?, ?)`,
                  [id, type, key, value, now],
                  () => resolve({ success: true }),
                  (_, error) => {
                    console.error('Error inserting reference data', error);
                    reject(error);
                    return false;
                  }
                );
              }
            },
            (_, error) => {
              console.error('Error checking reference data', error);
              reject(error);
              return false;
            }
          );
        }, error => {
          console.error('Transaction error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in addReferenceData:', error);
      throw error;
    }
  }

  getReferenceData(type) {
    if (this.useInMemoryFallback) {
      return this.inMemoryDB.referenceData
        .filter(item => item.type === type)
        .map(item => ({
          id: item.id,
          key: item.key,
          name: JSON.parse(item.value).name || item.key,
          value: item.value
        }));
    }
    
    // Synchronous version for reference data
    // This is used in dropdown lists where we need immediate results
    try {
      const data = [];
      
      this.db.readTransaction(tx => {
        tx.executeSql(
          `SELECT * FROM reference_data WHERE type = ?`,
          [type],
          (_, { rows }) => {
            for (let i = 0; i < rows.length; i++) {
              const item = rows.item(i);
              let parsedValue = item.value;
              try {
                parsedValue = JSON.parse(item.value);
              } catch (e) {
                // If not JSON, use as is
              }
              
              data.push({
                id: item.id,
                key: item.key,
                name: parsedValue.name || item.key,
                value: item.value
              });
            }
          },
          (_, error) => {
            console.error('Error getting reference data', error);
            return false;
          }
        );
      }, error => {
        console.error('Transaction error:', error);
      });
      
      return data;
    } catch (error) {
      console.error('Error in getReferenceData:', error);
      return [];
    }
  }

  async getReferenceDatas(filters = {}) {
    await this.ensureInitialized();
    
    if (this.useInMemoryFallback) {
      return this.inMemoryGetReferenceDatas(filters);
    }
    
    // Build the SQL query based on filters
    let query = 'SELECT * FROM reference_data';
    const params = [];
    const conditions = [];
    
    if (filters.type) {
      conditions.push('type = ?');
      params.push(filters.type);
    }
    
    if (filters.key) {
      conditions.push('key = ?');
      params.push(filters.key);
    }
    
    if (filters.id) {
      conditions.push('id = ?');
      params.push(filters.id);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    try {
      const result = await this.executeQuery(query, params);
      return result.rows._array;
    } catch (error) {
      console.error('Error getting reference data:', error);
      // Fall back to in-memory if SQLite fails
      return this.inMemoryGetReferenceDatas(filters);
    }
  }

  inMemoryGetReferenceDatas(filters = {}) {
    console.log('Using in-memory reference data with filters:', filters);
    
    let items = [...this.inMemoryDB.referenceData];
    
    // Apply filters
    if (filters.type) {
      items = items.filter(item => item.type === filters.type);
    }
    
    if (filters.key) {
      items = items.filter(item => item.key === filters.key);
    }
    
    if (filters.id) {
      items = items.filter(item => item.id === filters.id);
    }
    
    return items;
  }

  async initializeReferenceData() {
    // Add some default categories if there are none
    const categories = [
      { id: 'CATEGORY_1', type: 'CATEGORY', key: '1', value: 'Starters' },
      { id: 'CATEGORY_2', type: 'CATEGORY', key: '2', value: 'Main Course' },
      { id: 'CATEGORY_3', type: 'CATEGORY', key: '3', value: 'Desserts' },
      { id: 'CATEGORY_4', type: 'CATEGORY', key: '4', value: 'Beverages' }
    ];
    
    // Add veg/non-veg options
    const vegOptions = [
      { id: 'VEG_NONVEG_1', type: 'VEG_NONVEG', key: 'VEG', value: 'Vegetarian' },
      { id: 'VEG_NONVEG_2', type: 'VEG_NONVEG', key: 'NONVEG', value: 'Non-Vegetarian' }
    ];
    
    // Add spicy options
    const spicyOptions = [
      { id: 'SPICY_1', type: 'SPICY', key: '1', value: 'Not Spicy' },
      { id: 'SPICY_2', type: 'SPICY', key: '2', value: 'Mild' },
      { id: 'SPICY_3', type: 'SPICY', key: '3', value: 'Medium' },
      { id: 'SPICY_4', type: 'SPICY', key: '4', value: 'Spicy' },
      { id: 'SPICY_5', type: 'SPICY', key: '5', value: 'Very Spicy' }
    ];
    
    // Add all to in-memory database
    if (this.useInMemoryFallback) {
      this.inMemoryDB.referenceData = [
        ...categories,
        ...vegOptions,
        ...spicyOptions
      ];
      console.log('Initialized in-memory reference data');
      return;
    }
    
    // Otherwise add to SQLite
    try {
      // Create table if not exists
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS reference_data (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          lastUpdated TEXT
        )
      `);
      
      // Add all reference data
      const allData = [...categories, ...vegOptions, ...spicyOptions];
      for (const item of allData) {
        await this.executeQuery(
          `INSERT OR REPLACE INTO reference_data (id, type, key, value, lastUpdated)
           VALUES (?, ?, ?, ?, ?)`,
          [item.id, item.type, item.key, item.value, new Date().toISOString()]
        );
      }
      
      console.log('Initialized SQLite reference data');
    } catch (error) {
      console.error('Error initializing reference data:', error);
      // Fall back to in-memory
      this.inMemoryDB.referenceData = [
        ...categories,
        ...vegOptions,
        ...spicyOptions
      ];
    }
  }

  // Helper methods
  formatMenuItemFromDatabase(row) {
    return {
      localId: row.local_id,
      serverId: row.server_id,
      name: row.name,
      menuCatId: row.menu_cat_id,
      vegNonveg: row.veg_nonveg,
      spicyIndex: row.spicy_index,
      fullPrice: row.full_price,
      halfPrice: row.half_price,
      description: row.description,
      ingredients: row.ingredients,
      offer: row.offer,
      userId: row.user_id,
      outletId: row.outlet_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      pendingSync: row.pending_sync === 1,
      deleted: row.deleted === 1
    };
  }

  // In-memory fallback implementations
  inMemoryGetMenuItem(localId) {
    const menuItem = this.inMemoryDB.menuItems.find(item => item.localId === localId);
    if (!menuItem) return null;
    
    // Add images
    const images = this.inMemoryDB.menuImages
      .filter(img => img.menuItemId === localId)
      .map(img => img.imageUri);
    
    return {
      ...menuItem,
      images
    };
  }

  inMemoryGetMenuItems(filters = {}) {
    let items = [...this.inMemoryDB.menuItems];
    
    // Apply filters
    if (filters.outletId) {
      items = items.filter(item => item.outletId === filters.outletId);
    }
    
    if (filters.menuCatId) {
      items = items.filter(item => item.menuCatId === filters.menuCatId);
    }
    
    if (filters.includePendingSync === false) {
      items = items.filter(item => !item.pendingSync);
    }
    
    if (filters.includeDeleted === false) {
      items = items.filter(item => !item.deleted);
    }
    
    if (filters.status) {
      items = items.filter(item => item.status === filters.status);
    }
    
    // Add images to each item
    return items.map(item => {
      const images = this.inMemoryDB.menuImages
        .filter(img => img.menuItemId === item.localId)
        .map(img => img.imageUri);
      
      return {
        ...item,
        images
      };
    });
  }

  inMemoryGetPendingSyncItems() {
    const pendingItems = this.inMemoryDB.menuItems.filter(item => item.pendingSync);
    
    // Add images to each item
    return pendingItems.map(item => {
      const images = this.inMemoryDB.menuImages
        .filter(img => img.menuItemId === item.localId)
        .map(img => img.imageUri);
      
      return {
        ...item,
        images
      };
    });
  }

  inMemoryMarkAsSynced(localId, serverId) {
    const index = this.inMemoryDB.menuItems.findIndex(item => item.localId === localId);
    if (index === -1) return { success: false };
    
    this.inMemoryDB.menuItems[index] = {
      ...this.inMemoryDB.menuItems[index],
      serverId,
      pendingSync: false
    };
    
    return { success: true };
  }

  // Utility Methods
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async testDatabaseConnection() {
    try {
      await this.ensureInitialized();
      console.log('Database connection test: SUCCESS');
      console.log('Using in-memory fallback:', this.useInMemoryFallback);
      
      // Test reference data
      const categories = await this.getReferenceDatas({ type: 'CATEGORY' });
      console.log('Test categories:', categories);
      
      return {
        success: true,
        usingFallback: this.useInMemoryFallback,
        categories: categories
      };
    } catch (error) {
      console.error('Database connection test FAILED:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Add method to permanently delete an item
  async permanentlyDeleteMenuItem(localId) {
    await this.ensureInitialized();
    
    try {
      if (this.useInMemoryFallback) {
        // Remove from in-memory DB
        const itemIndex = this.inMemoryDB.menuItems.findIndex(item => item.localId === localId);
        if (itemIndex !== -1) {
          this.inMemoryDB.menuItems.splice(itemIndex, 1);
        }
        
        // Remove associated images
        this.inMemoryDB.menuImages = this.inMemoryDB.menuImages.filter(
          img => img.menuItemId !== localId
        );
        
        return { success: true };
      }
      
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          // First delete associated images
          tx.executeSql(
            `DELETE FROM menu_images WHERE menu_item_id = ?`,
            [localId],
            () => {
              // Then delete the menu item
              tx.executeSql(
                `DELETE FROM menu_items WHERE local_id = ?`,
                [localId],
                (_, result) => {
                  resolve({ success: true, rowsAffected: result.rowsAffected });
                },
                (_, error) => {
                  console.error('Error deleting menu item:', error);
                  reject(error);
                  return false;
                }
              );
            },
            (_, error) => {
              console.error('Error deleting menu images:', error);
              reject(error);
              return false;
            }
          );
        });
      });
    } catch (error) {
      console.error('Error in permanentlyDeleteMenuItem:', error);
      throw error;
    }
  }

  // Method to get count of pending sync items
  async getPendingSyncCount() {
    await this.ensureInitialized();
    
    try {
      if (this.useInMemoryFallback) {
        return this.inMemoryDB.menuItems.filter(item => item.pendingSync).length;
      }
      
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          tx.executeSql(
            `SELECT COUNT(*) as count FROM menu_items WHERE pending_sync = 1`,
            [],
            (_, result) => {
              resolve(result.rows.item(0).count);
            },
            (_, error) => {
              console.error('Error counting pending sync items:', error);
              reject(error);
              return false;
            }
          );
        });
      });
    } catch (error) {
      console.error('Error in getPendingSyncCount:', error);
      throw error;
    }
  }

  // Add this method to fetch and cache categories
  async fetchAndCacheCategories(accessToken, outletId) {
    try {
      // Fetch from API if online
      const response = await axios.post(
        onGetProductionUrl() + "menu_category_listview",
        { outlet_id: outletId },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        const categories = response.data.data;
        
        // Cache categories
        await this.cacheCategories(categories);
        return categories;
      }
      return [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Return cached categories if available
      return this.getCachedCategories();
    }
  }

  // Cache categories
  async cacheCategories(categories) {
    const now = new Date().toISOString();
    
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      console.log('No valid categories to cache');
      return;
    }
    
    if (this.useInMemoryFallback) {
      // Store in AsyncStorage
      await AsyncStorage.setItem('menuCategories', JSON.stringify(categories));
      return;
    }
    
    // Otherwise store in SQLite
    try {
      await this.executeQuery('DELETE FROM menu_categories');
      
      // Insert new categories
      for (const category of categories) {
        if (category && category.menu_cat_id && category.cat_name) {
          await this.executeQuery(
            'INSERT INTO menu_categories (id, name, status, lastUpdated) VALUES (?, ?, ?, ?)',
            [
              category.menu_cat_id, 
              category.cat_name, 
              category.status || '1', 
              now
            ]
          );
        }
      }
      console.log(`Cached ${categories.length} categories`);
    } catch (error) {
      console.error('Error caching categories:', error);
    }
  }

  // Get cached categories
  async getCachedCategories() {
    if (this.useInMemoryFallback) {
      const data = await AsyncStorage.getItem('menuCategories');
      return data ? JSON.parse(data) : [];
    }
    
    const result = await this.executeQuery('SELECT * FROM menu_categories WHERE status = "1"');
    return result.rows._array.map(row => ({
      menu_cat_id: row.id,
      cat_name: row.name,
      status: row.status
    }));
  }

  // Add this method to prevent errors
  async getPendingSyncWaiters() {
    try {
      console.log('Checking for pending waiter syncs');
      
      // If waiters table doesn't exist yet, return empty array
      const tableExists = await this.checkIfTableExists('waiters');
      if (!tableExists) {
        console.log('Waiters table does not exist');
        return [];
      }
      
      // Otherwise query for pending sync items
      const result = await this.executeQuery(
        'SELECT * FROM waiters WHERE pendingSync = 1'
      );
      
      return result.rows._array || [];
    } catch (error) {
      console.error('Error getting pending sync waiters:', error);
      return [];
    }
  }

  // Helper method to check if a table exists
  async checkIfTableExists(tableName) {
    try {
      const result = await this.executeQuery(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  }
}

export default new LocalDatabaseService(); 