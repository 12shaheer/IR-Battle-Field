#include <IRremote.hpp>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

#define IR_SEND_PIN 4
#define ONBOARD_LED 8  // ESP32-C3 SuperMini Built-in LED

#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define BLASTER_CHAR_UUID   "12345678-1234-1234-1234-123456789ab1"

class BlasterServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) override {
      Serial.println(">>> PHONE CONNECTED TO GATTSERVER <<<");

      // Quick double-blink on connection
      digitalWrite(ONBOARD_LED, LOW);  delay(80);
      digitalWrite(ONBOARD_LED, HIGH); delay(80);
      digitalWrite(ONBOARD_LED, LOW);  delay(80);
      digitalWrite(ONBOARD_LED, HIGH);
    }
    void onDisconnect(BLEServer* pServer) override {
      Serial.println(">>> PHONE DISCONNECTED. Restarting advertising... <<<");
      pServer->getAdvertising()->start();
    }
};

class BlasterCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) override {
        Serial.println(">>> BLE WRITE RECEIVED FROM APP! <<<");

        // Turn ON LED
        digitalWrite(ONBOARD_LED, LOW);

        String value = pCharacteristic->getValue();
        if (value.length() > 0) {
            uint8_t playerNumber = (uint8_t)value[0];
            Serial.print("Firing IR for Player Number: ");
            Serial.println(playerNumber);

            for (int i = 0; i < 3; i++) {
              IrSender.sendNEC(0x00, playerNumber, 0);
              delay(40);
            }
        }

        // Turn OFF LED
        digitalWrite(ONBOARD_LED, HIGH);
    }
};

void setup() {
  Serial.begin(115200);

  pinMode(ONBOARD_LED, OUTPUT);
  digitalWrite(ONBOARD_LED, HIGH); // Turn OFF initially

  IrSender.begin(IR_SEND_PIN, DISABLE_LED_FEEDBACK);

  BLEDevice::init("LaserTag-Blaster");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new BlasterServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
                                         BLASTER_CHAR_UUID,
                                         BLECharacteristic::PROPERTY_WRITE |
                                         BLECharacteristic::PROPERTY_WRITE_NR
                                       );

  pCharacteristic->setCallbacks(new BlasterCallbacks());
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("Blaster ready & advertising BLE!");
}

void loop() {
  delay(100);
}
