package main

import (
	"crypto/rand"
	"fmt"
	"time"
)

func uuidV7() string {
	now := time.Now().UnixMilli()
	var buf [16]byte

	buf[0] = byte(now >> 40)
	buf[1] = byte(now >> 32)
	buf[2] = byte(now >> 24)
	buf[3] = byte(now >> 16)
	buf[4] = byte(now >> 8)
	buf[5] = byte(now)

	rand.Read(buf[6:])

	buf[6] = (buf[6] & 0x0F) | 0x70
	buf[8] = (buf[8] & 0x3F) | 0x80

	return fmt.Sprintf("%x-%x-%x-%x-%x",
		buf[0:4], buf[4:6], buf[6:8], buf[8:10], buf[10:16])
}
