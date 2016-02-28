//<legalstuff> This work is licensed under a GNU General Public License, v3.0. Visit http://gnu.org/licenses/gpl-3.0-standalone.html for details. </legalstuff>
//Arduino code for SumoBot Jr. v2 (Servo Version). Copyright (©) 2016, Bryce Peterson (Nickname: Pecacheu, Email: Pecacheu@gmail.com)

#include <Servo.h>

//#define NUM_MOTORS 2
#define STATUS_LED 13

//Pin Numbers:
#define MOTOR1 2
#define MOTOR2 3

#define MIN_PULSE 900
#define MAX_PULSE 2100

//Globals: (Don't touch these!)
Servo Motor1; Servo Motor2;

void setup() {
  //Setup Pins & Motors:
  pinMode(STATUS_LED, OUTPUT);
  Motor1.attach(MOTOR1); Motor2.attach(MOTOR2);
  //Init Serial Comm:
  Serial.begin(9600); delay(500);
}

void loop() {
  String msg = ""; boolean msgDone = false;
  while(1) {
    //Read New Commands From Serial:
    while(Serial.available() > 0) {
      char newChar = Serial.read();
      //Serial.print((unsigned char)newChar); Serial.print(" = '"); Serial.write(newChar); Serial.println("'"); //<< DEBUG
      if(newChar == '\n') { msgDone = true; break; }
      else msg += newChar;
    }
    
    //Process Next Command:
    if(msgDone && msg.length() >= 1) {
      Serial.print("Data: [");
      for(int i=0; i<msg.length(); i++) { if(i > 0) Serial.print(", "); Serial.print((unsigned char)msg[i]); }
      Serial.print("], Event Type: ");
      if(msg[0] == 'K' && msg.length() == 3) { //Key Update Event:
        Serial.println("Key Update");
        char LEFT = msg[1]; char RIGHT = msg[2];
        driveMotor(1, LEFT); driveMotor(2, RIGHT);
      } else { //Unknown Event:
        Serial.println("Unknown");
      }
    }
    
    //Clear Processed Message Data:
    if(msgDone) { msg = ""; msgDone = false; }
  }
}

//Motor Control Functions:
void driveMotor(unsigned int motorNum, unsigned char power) {
  Servo SERVO;
  if(motorNum == 1) SERVO = Motor1;
  else if(motorNum == 2) SERVO = Motor2;
  else return;
  if(power == 128) SERVO.writeMicroseconds((MAX_PULSE+MIN_PULSE)/2);
  else SERVO.writeMicroseconds(floor((double(power)/255*(MAX_PULSE-MIN_PULSE))+MIN_PULSE));
}
