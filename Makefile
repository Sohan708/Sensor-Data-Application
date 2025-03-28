CC = gcc
TARGET = SensorDataApp
SRC = c_programming/sensor.c
OBJ = c_programming/sensor.o
INC = -I/usr/include/json-c
LIBS = -L/usr/lib -ljson-c

$(TARGET): $(OBJ)
	$(CC) $(OBJ) -o $(TARGET) $(LIBS)

$(OBJ): $(SRC)
	$(CC) $(INC) -c $(SRC) -o $(OBJ)
