# Makefile for chat_program

UNAME := $(shell uname -s 2>/dev/null || echo Windows)

CC = gcc
CFLAGS = -Wall -Wextra -std=c11 -I./src/common
LDFLAGS =

# Platform-specific flags
ifeq ($(UNAME),Linux)
    LDFLAGS += -pthread $(shell pkg-config --cflags --libs gtk4) -lmysqlclient
endif
ifneq (,$(findstring MINGW,$(UNAME))$(findstring Windows,$(UNAME)))
    LDFLAGS += -pthread -lws2_32 $(shell pkg-config --cflags --libs gtk4) -lmysql
    EXE = .exe
endif

# Server sources
SERVER_SRCS = $(SERVER_DIR)/main.c $(SERVER_DIR)/client_handler.c $(SERVER_DIR)/router.c $(SERVER_DIR)/broadcast.c $(SERVER_DIR)/auth.c $(SERVER_DIR)/friend.c $(SERVER_DIR)/dm.c $(SERVER_DIR)/room.c $(SERVER_DIR)/message.c $(SERVER_DIR)/user_store.c $(SERVER_DIR)/db.c

# Client sources
CLIENT_SRCS = $(CLIENT_DIR)/main.c $(CLIENT_DIR)/net.c $(CLIENT_DIR)/screen_login.c $(CLIENT_DIR)/screen_main.c $(CLIENT_DIR)/screen_chat.c $(CLIENT_DIR)/screen_mypage.c

# Targets
all: server client

server:
@echo Building server...

client:
@echo Building client...

.PHONY: all server client
