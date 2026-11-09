// The pre-game UI can be reviewed in a browser; gun pairing uses native BLE.
const unavailable = async () => { throw new Error('Gun Bluetooth pairing requires the Android app.'); };
export const bleManager = {
  enable: unavailable,
  state: async () => 'Unsupported',
  startDeviceScan: (_services, _options, callback) => callback(new Error('Gun Bluetooth pairing requires the Android app.')),
  stopDeviceScan() {},
  onStateChange: () => ({ remove() {} }),
  onDeviceDisconnected: () => ({ remove() {} }),
  cancelDeviceConnection: unavailable,
};
