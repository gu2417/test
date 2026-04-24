import { joinSession } from "@github/copilot-sdk/extension";
import { readFile } from "node:fs/promises";

const PROJECT_ROOT = new URL("../../../", import.meta.url).pathname.replace(/\/$/, "");
const DOCS_API = `${PROJECT_ROOT}/docs/08_api`;

const PACKET_CATEGORIES = {
    auth: {
        file: "packets/auth.md",
        packets: ["REGISTER", "REGISTER_RES", "LOGIN", "LOGIN_RES", "LOGOUT", "PASS_CHANGE", "PASS_CHANGE_RES"],
    },
    room: {
        file: "packets/room.md",
        packets: ["ROOM_CREATE", "ROOM_CREATE_RES", "ROOM_JOIN", "ROOM_JOIN_RES", "ROOM_LEAVE",
                  "ROOM_LIST_REQ", "ROOM_LIST_RES", "ROOM_INVITE", "ROOM_KICK",
                  "ROOM_SET_NOTICE", "ROOM_INFO", "ROOM_EDIT", "ROOM_DELETE"],
    },
    message: {
        file: "packets/message.md",
        packets: ["CHAT", "CHAT_NOTIFY", "MSG_DELETE", "MSG_EDIT", "MSG_REPLY", "MSG_SEARCH", "MSG_SEARCH_RES", "WHISPER"],
    },
    dm: {
        file: "packets/dm.md",
        packets: ["DM_SEND", "DM_RECV", "DM_HISTORY_REQ", "DM_HISTORY_RES", "DM_READ"],
    },
    friend: {
        file: "packets/friend.md",
        packets: ["FRIEND_REQUEST", "FRIEND_REQUEST_RES", "FRIEND_ACCEPT", "FRIEND_REJECT",
                  "FRIEND_BLOCK", "FRIEND_DELETE", "FRIEND_LIST", "FRIEND_LIST_RES", "USER_SEARCH", "USER_SEARCH_RES"],
    },
    notify: {
        file: "packets/notify.md",
        packets: ["NOTIFY", "USER_VIEW", "USER_VIEW_RES"],
    },
    settings: {
        file: "packets/settings.md",
        packets: ["SETTINGS_GET", "SETTINGS_GET_RES", "SETTINGS_SET", "SETTINGS_SET_RES"],
    },
    keepalive: {
        file: "packets/keepalive.md",
        packets: ["PING", "PONG"],
    },
    typing: {
        file: "packets/typing.md",
        packets: ["TYPING_START", "TYPING_STOP", "TYPING_NOTIFY"],
    },
};

const PACKET_SUMMARY = {
    REGISTER:       { dir: "C→S", fmt: "REGISTER|id|password|nickname" },
    REGISTER_RES:   { dir: "S→C", fmt: "REGISTER_RES|code  (0=OK, 1=ID중복, 8=닉네임중복)" },
    LOGIN:          { dir: "C→S", fmt: "LOGIN|id|password" },
    LOGIN_RES:      { dir: "S→C", fmt: "LOGIN_RES|code|id|nickname  (0=OK, 1=ID불일치, 2=PW불일치, 3=중복접속)" },
    LOGOUT:         { dir: "C→S", fmt: "LOGOUT" },
    CHAT:           { dir: "C→S", fmt: "CHAT|room_id|content" },
    CHAT_NOTIFY:    { dir: "S→C", fmt: "CHAT_NOTIFY|room_id|from_id|nickname|msg_id|content" },
    ROOM_CREATE:    { dir: "C→S", fmt: "ROOM_CREATE|name|is_open|max_users|password" },
    ROOM_CREATE_RES:{ dir: "S→C", fmt: "ROOM_CREATE_RES|code|room_id" },
    ROOM_JOIN:      { dir: "C→S", fmt: "ROOM_JOIN|room_id|password" },
    ROOM_JOIN_RES:  { dir: "S→C", fmt: "ROOM_JOIN_RES|code|room_id|room_name" },
    ROOM_LEAVE:     { dir: "C→S", fmt: "ROOM_LEAVE|room_id" },
    ROOM_LIST_REQ:  { dir: "C→S", fmt: "ROOM_LIST_REQ|type  (type=group|open)" },
    ROOM_LIST_RES:  { dir: "S→C", fmt: "ROOM_LIST_RES|code|id:name:cur:max:has_pw;..." },
    DM_SEND:        { dir: "C→S", fmt: "DM_SEND|to_id|content" },
    DM_RECV:        { dir: "S→C", fmt: "DM_RECV|from_id|nickname|msg_id|content|timestamp" },
    FRIEND_REQUEST: { dir: "C→S", fmt: "FRIEND_REQUEST|target_id" },
    FRIEND_REQUEST_RES: { dir: "S→C", fmt: "FRIEND_REQUEST_RES|code  (0=전송됨, 1=없는ID, 2=차단됨, 3=이미친구)" },
    FRIEND_LIST:    { dir: "C→S", fmt: "FRIEND_LIST" },
    FRIEND_LIST_RES:{ dir: "S→C", fmt: "FRIEND_LIST_RES|code|id:nick:online;..." },
    NOTIFY:         { dir: "S→C", fmt: "NOTIFY|type|content" },
    PING:           { dir: "C→S", fmt: "PING" },
    PONG:           { dir: "S→C", fmt: "PONG" },
};

async function readDocFile(path) {
    try {
        return await readFile(path, "utf8");
    } catch {
        return null;
    }
}

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("c-chat-proto: 패킷 프로토콜 도구 로드됨", { ephemeral: true });
        },
    },
    tools: [
        {
            name: "list_packets",
            description: "전체 패킷 타입 목록을 카테고리별로 반환",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const lines = ["# 패킷 타입 목록\n"];
                for (const [cat, { packets }] of Object.entries(PACKET_CATEGORIES)) {
                    lines.push(`## ${cat.toUpperCase()}\n`);
                    for (const pkt of packets) {
                        const info = PACKET_SUMMARY[pkt];
                        if (info) {
                            lines.push(`- **${pkt}** [${info.dir}]: \`${info.fmt}\``);
                        } else {
                            lines.push(`- **${pkt}**`);
                        }
                    }
                    lines.push("");
                }
                lines.push("\n> 상세 스펙: get_packet_spec 툴 사용");
                return lines.join("\n");
            },
        },
        {
            name: "get_packet_spec",
            description: "특정 패킷 카테고리의 전체 명세 반환 (docs/08_api/packets/*.md)",
            parameters: {
                type: "object",
                properties: {
                    category: {
                        type: "string",
                        description: "카테고리: auth, room, message, dm, friend, notify, settings, keepalive, typing",
                    },
                },
                required: ["category"],
            },
            handler: async ({ category }) => {
                const cat = PACKET_CATEGORIES[category];
                if (!cat) {
                    return `알 수 없는 카테고리: ${category}\n사용 가능: ${Object.keys(PACKET_CATEGORIES).join(", ")}`;
                }
                const content = await readDocFile(`${DOCS_API}/${cat.file}`);
                if (!content) {
                    return `문서 파일을 찾을 수 없음: ${cat.file}`;
                }
                return content;
            },
        },
        {
            name: "get_packet_format_rules",
            description: "패킷 프레임 형식, 구분자, 검증 규칙, 타임아웃 전체 반환",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const content = await readDocFile(`${DOCS_API}/packet_format.md`);
                return content ?? `# 패킷 형식 요약
- 형식: TYPE|field1|field2|...|content\\n
- 최대: 2048 byte (초과 시 연결 drop)
- 구분자: | (필드), : (다중값), ; (리스트 반복)
- 문자셋: UTF-8
- keepalive: 30초마다 PING, 90초 무응답 시 세션 종료`;
            },
        },
        {
            name: "get_packet_code_example",
            description: "packet_build() / packet_parse() 사용 코드 예시 반환",
            parameters: {
                type: "object",
                properties: {
                    packet_type: {
                        type: "string",
                        description: "예시를 원하는 패킷 타입 (예: LOGIN, CHAT, ROOM_LIST_RES)",
                    },
                },
                required: ["packet_type"],
            },
            handler: async ({ packet_type }) => {
                const info = PACKET_SUMMARY[packet_type.toUpperCase()];
                const type = packet_type.toUpperCase();
                const dir = info ? info.dir : "?";
                const fmt = info ? info.fmt : `${type}|...`;

                return `### ${type} 패킷 코드 예시

**방향**: ${dir}  
**형식**: \`${fmt}\`

#### 서버에서 전송 (packet_build)
\`\`\`c
#include "common/protocol.h"

char buf[MAX_PACKET_SIZE];
// packet_build(buf, sizeof(buf), TYPE, field1, field2, ..., NULL)
packet_build(buf, sizeof(buf), "${type}", "arg1", "arg2", NULL);
notify_user(session->id, buf);   // 단일 전송
// 또는
bcast_room(room_id, buf);        // 방 전체 전송
\`\`\`

#### 클라이언트에서 수신 (packet_parse)
\`\`\`c
char type[32];
char fields[16][256];
int  n = packet_parse(line, type, fields, 16);

if (strcmp(type, "${type}") == 0 && n >= 2) {
    // fields[0] = 첫 번째 필드
    // fields[1] = 두 번째 필드
    // ...
    // UI 업데이트는 반드시 g_idle_add() 경유
}
\`\`\``;
            },
        },
    ],
});
