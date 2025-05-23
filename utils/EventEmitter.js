import { DeviceEventEmitter } from 'react-native';

export const EventEmitter = {
  emit: (event, data) => DeviceEventEmitter.emit(event, data),
  addListener: (event, callback) => DeviceEventEmitter.addListener(event, callback)
}; 