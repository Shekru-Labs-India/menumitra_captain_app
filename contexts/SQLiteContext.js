import React, { createContext, useContext, useEffect, useState } from 'react';
import LocalDatabaseService from '../services/LocalDatabaseService';
import SyncService from '../services/SyncService';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const SQLiteContext = createContext(null);

export function SQLiteProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'success', 'error'
  const [syncMessage, setSyncMessage] = useState('');
  const [pendingChangesCount, setPendingChangesCount] = useState(0);

  // Initialize the database
  useEffect(() => {
    const initDatabase = async () => {
      try {
        await LocalDatabaseService.ensureInitialized();
        setIsInitialized(true);
        refreshPendingChangesCount();
      } catch (error) {
        console.error('Failed to initialize the database:', error);
        Alert.alert('Database Error', 'Failed to initialize the database');
      }
    };

    initDatabase();
  }, []);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);

  // Listen for sync status updates
  useEffect(() => {
    const unsubscribe = SyncService.addSyncListener((status, message) => {
      setSyncStatus(status);
      setSyncMessage(message);
      
      if (status === 'success') {
        refreshPendingChangesCount();
      }
    });

    return unsubscribe;
  }, []);

  // Refresh the pending changes count
  const refreshPendingChangesCount = async () => {
    if (isInitialized) {
      try {
        const pendingItems = await LocalDatabaseService.getPendingSyncItems();
        setPendingChangesCount(pendingItems.length);
      } catch (error) {
        console.error('Failed to get pending sync items:', error);
      }
    }
  };

  // Manually trigger synchronization
  const synchronize = async (accessToken) => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot synchronize while offline');
      return { success: false };
    }
    
    const result = await SyncService.synchronize(accessToken);
    return result;
  };

  // Context value
  const contextValue = {
    isInitialized,
    isOnline,
    syncStatus,
    syncMessage,
    pendingChangesCount,
    refreshPendingChangesCount,
    synchronize,
    db: LocalDatabaseService,
    sync: SyncService
  };

  return (
    <SQLiteContext.Provider value={contextValue}>
      {children}
    </SQLiteContext.Provider>
  );
}

// Hook to use the SQLite context
export function useSQLite() {
  const context = useContext(SQLiteContext);
  if (!context) {
    throw new Error('useSQLite must be used within a SQLiteProvider');
  }
  return context;
} 