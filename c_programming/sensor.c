/* includes */
#include <stdio.h>
#include <stdint.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <sys/ioctl.h>
#include <linux/i2c-dev.h>
#include <stdbool.h>
#include <time.h>
#include <sys/stat.h>
#include <json-c/json.h>  // For JSON formatting

/* defines */
#define SENSOR_ADDR_1 0x0A  // I2C address of sensor 1
#define SENSOR_ADDR_2 0x0B  // I2C address of sensor 2
#define N_ROW 4
#define N_PIXEL (4 * 4)
#define N_READ ((N_PIXEL + 1) * 2 + 1)
#define I2CDEV "/dev/i2c-0"  // Using I2C bus 0 as per requirement
#define PIPE_NAME "/tmp/sensor_data_pipe"  // Named pipe location

uint8_t rbuf[N_READ];
double ptat;
double pix_data[N_PIXEL];

// Function to convert 2 bytes to signed 16-bit integer (little endian)
int16_t conv8us_s16_le(uint8_t* buf, int n) {
    int16_t ret;
    ret = (int16_t)((buf[n] | (buf[n + 1] << 8)));
    return ret;
}

// Helper function for delay
void delay(int msec) {
    struct timespec ts = {.tv_sec = msec / 1000, .tv_nsec = (msec % 1000) * 1000000};
    nanosleep(&ts, NULL);
}

// I2C read function
uint32_t i2c_read_reg8(uint8_t devAddr, uint8_t regAddr, uint8_t *data, int length) {
    int fd = open(I2CDEV, O_RDWR);
    if (fd < 0) {
        fprintf(stderr, "Error opening device: %s\n", strerror(errno));
        return 21;
    }
    int err = 0;
    do {
        if (ioctl(fd, I2C_SLAVE, devAddr) < 0) {
            fprintf(stderr, "Error selecting device: %s\n", strerror(errno));
            err = 22; break;
        }
        if (write(fd, &regAddr, 1) != 1) {
            err = 23; break;
        }
        delay(1);  // Delay after sending command
        int count = read(fd, data, length);
        if (count < 0) {
            err = 24; break;
        } else if (count != length) {
            fprintf(stderr, "Short read from device, expected %d, got %d\n", length, count);
            err = 25; break;
        }
    } while (false);
    close(fd);
    return err;
}

// Function to generate JSON data
void generate_json(int sensor_id, double *pix_data) {
    struct json_object *jobj, *jtemp, *jarray;
    jobj = json_object_new_object();

    // Add sensor information
    json_object_object_add(jobj, "sensor_id", json_object_new_string(sensor_id == 1 ? "sensor_1" : "sensor_2"));

    // Add date and time
    time_t t = time(NULL);
    struct tm tm = *localtime(&t);
    char date_time[100];
    sprintf(date_time, "%d-%02d-%02d %02d:%02d:%02d", tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday, tm.tm_hour, tm.tm_min, tm.tm_sec);

    json_object_object_add(jobj, "date", json_object_new_string(date_time));

    // Add temperature data
    jarray = json_object_new_array();
    for (int i = 0; i < N_PIXEL; i++) {
        jtemp = json_object_new_double(pix_data[i]);
        json_object_array_add(jarray, jtemp);
    }
    json_object_object_add(jobj, "temperature", jarray);

    // Write JSON data to the named pipe
    int pipe_fd = open(PIPE_NAME, O_WRONLY);
    if (pipe_fd == -1) {
        perror("Error opening pipe");
        return;
    }

    const char *json_str = json_object_to_json_string(jobj);
    write(pipe_fd, json_str, strlen(json_str) + 1);
    close(pipe_fd);

    // Free the JSON object
    json_object_put(jobj);
}

// Main function
int main() {
    printf("Starting D6T-44L-06 Temperature Sensor Data Collector\n");
    
    // Create named pipe if not exists
    if (access(PIPE_NAME, F_OK) == -1) {
        printf("Creating named pipe at %s\n", PIPE_NAME);
        if (mkfifo(PIPE_NAME, 0666) == -1) {
            perror("Error creating named pipe");
            return 1;
        }
    }

    int sensor_addresses[] = {SENSOR_ADDR_1, SENSOR_ADDR_2};  // Sensor IDs
    printf("Monitoring %lu sensors\n", sizeof(sensor_addresses) / sizeof(sensor_addresses[0]));

    while (1) {
        for (int i = 0; i < sizeof(sensor_addresses) / sizeof(sensor_addresses[0]); i++) {
            uint32_t ret = i2c_read_reg8(sensor_addresses[i], 0x00, rbuf, N_READ);
            if (ret != 0) {
                fprintf(stderr, "Error reading data from sensor %d (error code: %u)\n", i + 1, ret);
                continue;
            }

            ptat = (double)conv8us_s16_le(rbuf, 0) / 10.0;
            for (int j = 0; j < N_PIXEL; j++) {
                int16_t itemp = conv8us_s16_le(rbuf, 2 + 2 * j);
                pix_data[j] = (double)itemp / 10.0;
            }

            // Generate JSON and write to the pipe
            generate_json(i + 1, pix_data);
            printf("Data sent from sensor %d\n", i + 1);
            delay(300);  // Delay before reading again
        }
    }

    return 0;
}
