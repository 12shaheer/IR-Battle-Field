#include <IRremote.hpp>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>

#define IR_RECEIVE_PIN 10

// BLE UUIDs matching your app specification
#define SERVICE_UUID          "12345678-1234-1234-1234-123456789abc"
#define RECEIVER_CHAR_UUID    "12345678-1234-1234-1234-123456789ab2"

BLECharacteristic *pReceiverChar;
bool deviceConnected = false;
unsigned long lastHitTime = 0;
const unsigned long HIT_COOLDOWN_MS = 1000;

class ServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) override {
      deviceConnected = true;
      Serial.println("Phone connected to Receiver!");
    }
    void onDisconnect(BLEServer* pServer) override {
      deviceConnected = false;
      Serial.println("Phone disconnected. Restarting advertising...");
      BLEDevice::startAdvertising();
    }
};

void setup() {
  Serial.begin(115200);

  // Initialize IR Receiver on GPIO 10
  IrReceiver.begin(IR_RECEIVE_PIN, DISABLE_LED_FEEDBACK);

  // Initialize BLE Server
  BLEDevice::init("LaserTag-Receiver");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pReceiverChar = pService->createCharacteristic(
                      RECEIVER_CHAR_UUID,
                      BLECharacteristic::PROPERTY_NOTIFY
                  );
  pReceiverChar->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("Receiver ready & advertising BLE!");
}

void loop() {
  if (IrReceiver.decode()) {
    // Validate NEC protocol, address 0x00, and non-zero player ID
    if (IrReceiver.decodedIRData.protocol == NEC &&
        IrReceiver.decodedIRData.address == 0x00 &&
        IrReceiver.decodedIRData.command != 0) {

      unsigned long currentTime = millis();
      if (currentTime - lastHitTime >= HIT_COOLDOWN_MS) {
        lastHitTime = currentTime;
        uint8_t shooterNumber = IrReceiver.decodedIRData.command;

        Serial.print("HIT REGISTERED! Shooter Player #: ");
        Serial.println(shooterNumber);

        if (deviceConnected) {
          pReceiverChar->setValue(&shooterNumber, 1);
          pReceiverChar->notify();
        }
      }
    }
    IrReceiver.resume();
  }
}
