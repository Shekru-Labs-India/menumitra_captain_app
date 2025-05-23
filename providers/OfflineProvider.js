import React, { createContext, useState, useEffect, useContext } from 'react';
import NetInfo from '@react-native-community/netinfo';
import SyncService from '../services/SyncService';
import LocalDatabaseService from '../services/LocalDatabaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create context
export const OfflineContext = createContext();

export function useOffline() {
  return useContext(OfflineContext);
}

export default function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState({ status: 'idle', message: '' });
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize and setup listeners
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Ensure the database is initialized
        await LocalDatabaseService.ensureInitialized();
        setIsInitialized(true);
        
        // Check for pending changes
        await checkPendingChanges();
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };

    // Check network status
    checkNetworkStatus();
    
    // Initialize database
    initializeDatabase();
    
    // Subscribe to network changes
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online);
      
      // If we've gone from offline to online, attempt auto-sync
      if (online && !isOnline) {
        checkPendingChanges().then(count => {
          if (count > 0) {
            autoSync();
          }
        });
      }
    });
    
    // Subscribe to sync status changes
    const unsubscribeSyncStatus = SyncService.addSyncListener(status => {
      setSyncStatus(status);
      if (status.status === 'completed') {
        checkPendingChanges();
        updateLastSyncTime();
      }
    });
    
    // Load last sync time
    loadLastSyncTime();
    
    // Cleanup
    return () => {
      unsubscribeNetInfo();
      unsubscribeSyncStatus();
    };
  }, [isOnline]);
  
  const checkNetworkStatus = async () => {
    const networkState = await NetInfo.fetch();
    setIsOnline(networkState.isConnected && networkState.isInternetReachable);
  };
  
  const checkPendingChanges = async () => {
    try {
      if (!isInitialized) return 0;
      
      const pendingItems = await LocalDatabaseService.getPendingSyncItems();
      const count = pendingItems.length;
      setPendingChanges(count);
      return count;
    } catch (error) {
      console.error('Error checking pending changes:', error);
      return 0;
    }
  };
  
  const loadLastSyncTime = async () => {
    try {
      const lastSync = await AsyncStorage.getItem('lastSyncTime');
      if (lastSync) {
        setLastSyncTime(new Date(lastSync));
      }
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  };
  
  const updateLastSyncTime = async () => {
    const now = new Date();
    setLastSyncTime(now);
    await AsyncStorage.setItem('lastSyncTime', now.toISOString());
  };
  
  const autoSync = async () => {
    try {
      if (syncStatus.status === 'started' || syncStatus.status === 'progress') {
        return;
      }
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token available for auto-sync');
        return;
      }
      
      await SyncService.synchronize(token);
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  };
  
  const synchronize = async (token) => {
    if (syncStatus.status === 'started' || syncStatus.status === 'progress') {
      return { success: false, message: 'Sync already in progress' };
    }
    
    if (!isOnline) {
      return { success: false, message: 'No internet connection available' };
    }
    
    // If no token is provided, try to get it from storage
    if (!token) {
      token = await AsyncStorage.getItem('token');
      if (!token) {
        return { success: false, message: 'No token available' };
      }
    }
    
    return await SyncService.synchronize(token);
  };
  
  // The value that will be provided to consumers of this context
  const value = {
    isOnline,
    syncStatus,
    pendingChanges,
    lastSyncTime,
    isInitialized,
    synchronize,
    checkPendingChanges,
  };
  
  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
} 