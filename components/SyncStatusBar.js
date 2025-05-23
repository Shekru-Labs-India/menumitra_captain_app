import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useOffline } from '../providers/OfflineProvider';

const SyncStatusBar = ({ isOnline, pendingChanges, syncStatus, onSyncPress }) => {
  if (!pendingChanges && !syncStatus) return null;
  
  let statusMessage = '';
  let color = '#2196F3'; // Default blue

  if (syncStatus) {
    // Handle active sync status
    if (syncStatus.status === 'started') {
      statusMessage = 'Syncing...';
      color = '#FF9800'; // Orange
    } else if (syncStatus.status === 'processing') {
      statusMessage = `Syncing ${syncStatus.current}/${syncStatus.total}: ${syncStatus.item}`;
      color = '#FF9800'; // Orange
    } else if (syncStatus.status === 'completed') {
      statusMessage = syncStatus.message;
      color = '#4CAF50'; // Green
    } else if (syncStatus.status === 'error') {
      statusMessage = `Error: ${syncStatus.message}`;
      color = '#F44336'; // Red
    }
  } else if (!isOnline) {
    // Offline status
    statusMessage = 'You are offline. Changes will sync when online.';
    color = '#757575'; // Gray
  } else if (pendingChanges) {
    // Pending changes while online
    statusMessage = `${pendingChanges} changes pending sync`;
    color = '#FF9800'; // Orange
  }
  
  return (
    <View style={[styles.container, { backgroundColor: color }]}>
      <Text style={styles.text}>{statusMessage}</Text>
      
      {isOnline && pendingChanges > 0 && !syncStatus && (
        <TouchableOpacity style={styles.syncButton} onPress={onSyncPress}>
          <Icon name="sync" size={18} color="#FFFFFF" />
          <Text style={styles.syncText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  syncText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontSize: 12,
  }
});

export default SyncStatusBar;