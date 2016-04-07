//<legalstuff> This work is licensed under a GNU General Public License, v3.0. Visit http://gnu.org/licenses/gpl-3.0-standalone.html for details. </legalstuff>
//SumoBot v3 Wireless Transmitter. Copyright (©) 2016, Bryce Peterson (Nickname: Pecacheu, Email: Pecacheu@gmail.com)

#include "RF24.h"

#define LIMIT 500 //Max cache limit before force-clearing.
byte CH[6] = "Node1"; //Communication channel name.

RF24 radio(8,9);

void setup() {
  //Init Wireless Radio:
  radio.begin(); radio.setPALevel(RF24_PA_MAX);
  radio.openWritingPipe(CH); Serial.begin(9600);
  //radio.startListening(); delay(500);
  //radio.setPayloadSize(1);
}

void loop() {
  //radio.stopListening();
  //Send Data Over Wireless Radio:
  while(Serial.available() > 0) {
    byte c = Serial.read(); //Keep Trying to send byte until sucessful:
    while(!radio.write(&c, sizeof(c))) {Serial.print("Failed to send '");Serial.print(c);Serial.println("'. Retrying...");if(Serial.available() > LIMIT) {clear();break;}}
    Serial.print("Sent '");Serial.print(c);Serial.println("'");
  }
}

void clear() {Serial.println("BUFFER LIMIT REACHED!");Serial.println("Clearing...");while(Serial.available()) Serial.read();}
