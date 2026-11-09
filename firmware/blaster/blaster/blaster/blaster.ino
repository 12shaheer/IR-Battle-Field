#include <IRSend.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>

#define TX_PIN 5
#define TRIGGER_PIN 4
#define DEVICE_ID "TX002"
#define SERVICE_UUID "08dbb28a-ce2c-467a-9f12-4f15d574a220"
#define DEVICE_ID_CHAR_UUID "1c9a1e2e-3d0a-4b3a-9a3a-2f3b4c5d6e7f"
#define USERNAME_CHAR_UUID "756ad6a4-2007-4dc4-9173-72dc7d6b2627"
#define FIRE_CHAR_UUID "8b91a0d2-5f7f-49cb-8939-4455d3d24b81"
#define COMBAT_LOCK_CHAR_UUID "64504f91-6444-4e50-85de-800a1828f3b1"
#define TRIGGER_CHAR_UUID "d4e8f591-6b7a-4c3d-9e2f-1a8b3c5d7e9f"

IRSend blaster(RMT_CHANNEL_0);
BLECharacteristic *fireChar, *triggerChar, *usernameChar, *deviceIdChar;
volatile bool deviceConnected = false;
volatile bool combatLocked = false;
volatile bool doReadvertise = false;
QueueHandle_t shotQueue;
volatile uint32_t myShooterHash = 0;

uint32_t hashUsername(const String& name) {
  uint32_t h = 2166136261u;
  for (int i = 0; i < name.length(); i++) {
    h ^= static_cast<uint8_t>(name[i]);
    h *= 16777619u;
  }
  return h & 0xFFFFFF;
}

void fireWeapon(uint8_t damage, bool fromTrigger) {
  if (combatLocked) return;
  uint32_t payload = (myShooterHash << 8) | damage;
  blaster.send(payload);
  if (fromTrigger && deviceConnected) {
    triggerChar->setValue(&damage, 1);
    triggerChar->notify();
  }
}

class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* server, esp_ble_gatts_cb_param_t* param) {
    deviceConnected = true;
    Serial.println("[BLE-TX] Connected");
    // Let the phone negotiate timing for its two simultaneous BLE links.
  }
  void onDisconnect(BLEServer* server) {
    deviceConnected = false;combatLocked = true;
    doReadvertise = true;
    Serial.println("[BLE-TX] Disconnected; advertising will restart");
  }
};

class UsernameCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) {
    std::string value = characteristic->getValue();
    if (!value.empty()) myShooterHash = hashUsername(String(value.c_str()));
  }
};

class CombatLockCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) {
    std::string value = characteristic->getValue();
    if (value.empty()) return;
    combatLocked = static_cast<uint8_t>(value[0]) != 0;
    if (combatLocked) xQueueReset(shotQueue);
  }
};

class FireCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) {
    std::string value = characteristic->getValue();
    uint8_t damage = value.empty() ? 10 : static_cast<uint8_t>(value[0]);
    xQueueSend(shotQueue, &damage, 0);
  }
};

void setup() {
  Serial.begin(115200);
  myShooterHash = hashUsername(String("player"));
  pinMode(TRIGGER_PIN, INPUT_PULLUP);
  shotQueue = xQueueCreate(8, sizeof(uint8_t));
  if (!shotQueue) { Serial.println("Shot queue allocation failed"); while (true) delay(1000); }
  String bleName = "DropZone-" + String(DEVICE_ID);
  BLEDevice::init(bleName.c_str());
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService *service = server->createService(BLEUUID(SERVICE_UUID), 20);

  deviceIdChar = service->createCharacteristic(DEVICE_ID_CHAR_UUID, BLECharacteristic::PROPERTY_READ);
  deviceIdChar->setValue(DEVICE_ID);
  usernameChar = service->createCharacteristic(USERNAME_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  usernameChar->setCallbacks(new UsernameCallback());
  fireChar = service->createCharacteristic(FIRE_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  fireChar->setCallbacks(new FireCallback());
  BLECharacteristic *combatLockChar = service->createCharacteristic(COMBAT_LOCK_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  combatLockChar->setCallbacks(new CombatLockCallback());
  triggerChar = service->createCharacteristic(TRIGGER_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  triggerChar->addDescriptor(new BLE2902());

  service->start();
  BLEAdvertising *advertising = server->getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->start();
  if (!blaster.start(TX_PIN, "NEC")) {
    Serial.println("[IR-TX] Initialization failed");
    while (true) delay(1000);
  }
}

void loop() {
  if (doReadvertise) {
    doReadvertise = false;
    delay(100);
    BLEDevice::startAdvertising();
  }
  uint8_t damage;
  if (xQueueReceive(shotQueue, &damage, 0) == pdTRUE) fireWeapon(damage, false);
  static bool lastPressed = false;
  static unsigned long lastTriggerAt = 0;
  bool pressed = digitalRead(TRIGGER_PIN) == LOW;
  if (pressed && !lastPressed && millis() - lastTriggerAt >= 150) {
    lastTriggerAt = millis();
    fireWeapon(10, true);
  }
  lastPressed = pressed;
  delay(1);
}
