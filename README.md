# SumoBot 2.0
Everything you need to build a SumoBot!

## Links:
1. Arduino Software at: www.arduino.cc/main/software
2. DCCduino USB-to-Serial chip driver: www.wch.cn/download/CH341SER_EXE.html
3. Mac OS X version: www.wch.cn/download/CH341SER_MAC_ZIP.html

After installing the DCCduino driver on Mac OS X 10.9 and higher, an extra terminal command may be necessary.
Open Terminal, enter **sudo nvram boot-args="kext-dev-mode=1"**, and hit return.

## SumoBot v3 Assembly Guide:
(Video guide coming soon!)
###### If you're using the acrylic (0.22in) version, determine if you want a cloudy robot or a clear robot. If it's the latter, peel the cloudy protector film off the pieces before use.

#### Side Pieces:
1. Press x-shape inserts onto servo shafts and screw down using black screw.
2. Squeeze black rubber spacers into upper 2 side slots on servo casing.
3. Insert servos into servo holes in side pieces, ensuring that they face in opposite directions.
4. Use 2 silver screws each to secure servos onto side pieces. Add rubber bands to wheels.
6. Attach wheels using 2 silver screws with black spacers (or silver spacers) each.

#### Bottom Piece:
6. Screw caster wheel onto bottom piece using remaining 2 black screws. Ensure it's on the opposite side of the piece from the arrow.

#### Chassis Assembly:
7. Insert top and bottom pieces into one of the side pieces, ensuring that all arrows face the same direction, and are on the top (for top and bottom pieces) or inner (for side pieces) side of each piece.
8. Add other side piece to the assembly. It's arrow should also face inwards.
9. Screw Arduino onto top piece using final 2 silver screws. The front left and back right holes will work best with most Arduino boards.

#### Wiring:
###### /* TO BE CONTINUED */

#### Final Steps:
10. Push front bumper onto front of robot.
11. Insert Li-Ion battery. Connect battery terminals to power block.

When robot is not in use, disconnect positive wire from battery side. *(NOT from breadboard power block side!)*