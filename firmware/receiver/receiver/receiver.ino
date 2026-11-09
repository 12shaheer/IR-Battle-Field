#include <IRRecv.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define RX_PIN 4
#ifndef DEVICE_ID
#define DEVICE_ID "RX002" // Gun 2: change to "RX002" before uploading.
#endif
#define SERVICE_UUID "7a3d1e09-b24f-4c8e-a649-83c2d5f17b30"
#define DEVICE_ID_CHAR_UUID "1c9a1e2e-3d0a-4b3a-9a3a-2f3b4c5d6e7f"
#define HIT_CHAR_UUID "a95980fb-4f18-4b2e-a258-81bf77575117"

IRRecv receiver(RMT_CHANNEL_3);
BLECharacteristic *hitChar, *deviceIdChar;
volatile bool deviceConnected = false;
volatile bool doReadvertise = false;
bool irReady = false;

class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* server, esp_ble_gatts_cb_param_t* param) override {
    deviceConnected = true;
    Serial.println("[BLE-RX] Connected");
  }
  void onDisconnect(BLEServer* server) override {
    deviceConnected = false;
    doReadvertise = true;
    Serial.println("[BLE-RX] Disconnected; advertising will restart");
  }
};

void setup() {
  Serial.begin(115200);
  Serial.printf("\n[BOOT] DropZone receiver %s; IR GPIO %d\n", DEVICE_ID, RX_PIN);
  String bleName = "DropZone-" + String(DEVICE_ID);
  BLEDevice::init(bleName.c_str());
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService *service = server->createService(BLEUUID(SERVICE_UUID), 15);

  deviceIdChar = service->createCharacteristic(DEVICE_ID_CHAR_UUID, BLECharacteristic::PROPERTY_READ);
  deviceIdChar->setValue(DEVICE_ID);
  hitChar = service->createCharacteristic(HIT_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  hitChar->addDescriptor(new BLE2902());

  service->start();
  BLEAdvertising *advertising = server->getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->start();
  Serial.printf("[BLE-RX] Advertising %s; waiting for phone\n", bleName.c_str());
  irReady = receiver.start(RX_PIN);
  if (irReady) receiver.setMargin(80);
  else Serial.println("[IR-RX] Initialization failed; BLE remains available, check board selection / IR32 / GPIO");
}

void loop() {
  if (doReadvertise) {
    doReadvertise = false;
    delay(100);
    BLEDevice::startAdvertising();
    Serial.println("[BLE-RX] Advertising restarted");
  }
  while (irReady && receiver.available() > 0) {
    char* protocol = nullptr;
    uint32_t result = receiver.read(protocol);
    if (!result) continue;
    uint32_t shooterHash = (result >> 8) & 0xFFFFFF;
    uint8_t damage = result & 0xFF;
    if (deviceConnected) {
      uint8_t notifyData[4] = {
        static_cast<uint8_t>(shooterHash >> 16),
        static_cast<uint8_t>(shooterHash >> 8),
        static_cast<uint8_t>(shooterHash),
        damage
      };
      hitChar->setValue(notifyData, sizeof(notifyData));
      hitChar->notify();
    }
  }
  delay(20);
}
