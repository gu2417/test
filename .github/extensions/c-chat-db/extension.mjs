import { joinSession } from "@github/copilot-sdk/extension";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = new URL("../../../", import.meta.url).pathname.replace(/\/$/, "");
const DOCS_DB = `${PROJECT_ROOT}/docs/07_database`;

async function readDocFile(path) {
    try {
        return await readFile(path, "utf8");
    } catch {
        return null;
    }
}

const TABLE_FILES = {
    users: "tables/users.md",
    user_settings: "tables/user_settings.md",
    friends: "tables/friends.md",
    rooms: "tables/rooms.md",
    room_members: "tables/room_members.md",
    messages: "tables/messages.md",
    dm_reads: "tables/dm_reads.md",
    room_invites: "tables/room_invites.md",
    reactions: "tables/reactions.md",
};

const QUERY_EXAMPLES = {
    login: `-- 로그인 조회
DbStmt *st = db_prepare(db, "SELECT id, password_hash, nickname FROM users WHERE id=?");
db_bind_str(st, 0, user_id);
db_execute(st);
if (db_fetch_row(st)) { ... }
db_stmt_close(st);`,

    register: `-- 회원가입 INSERT
DbStmt *st = db_prepare(db,
    "INSERT INTO users (id, password_hash, nickname) VALUES (?, SHA2(?,256), ?)");
db_bind_str(st, 0, id);
db_bind_str(st, 1, password);
db_bind_str(st, 2, nickname);
db_execute(st);
db_stmt_close(st);`,

    friend_list: `-- 친구 목록 (accepted)
DbStmt *st = db_prepare(db,
    "SELECT u.id, u.nickname, u.online_status "
    "FROM friends f JOIN users u ON u.id = f.friend_id "
    "WHERE f.user_id=? AND f.status=1 ORDER BY u.nickname");
db_bind_str(st, 0, my_id);`,

    room_members: `-- 방 멤버 목록
DbStmt *st = db_prepare(db,
    "SELECT rm.user_id, u.nickname, rm.is_admin "
    "FROM room_members rm JOIN users u ON u.id=rm.user_id "
    "WHERE rm.room_id=?");
db_bind_int(st, 0, room_id);`,

    chat_history: `-- 채팅방 메시지 히스토리 (최근 100개)
DbStmt *st = db_prepare(db,
    "SELECT m.id, m.from_id, u.nickname, m.content, m.created_at, m.is_deleted "
    "FROM messages m JOIN users u ON u.id=m.from_id "
    "WHERE m.room_id=? ORDER BY m.id DESC LIMIT 100");
db_bind_int(st, 0, room_id);`,

    user_search: `-- 유저 검색 (ID 또는 닉네임)
DbStmt *st = db_prepare(db,
    "SELECT id, nickname, status_msg FROM users "
    "WHERE (id LIKE ? OR nickname LIKE ?) LIMIT 30");
char pattern[64];
snprintf(pattern, sizeof(pattern), "%%%s%%", keyword_escaped);
db_bind_str(st, 0, pattern);
db_bind_str(st, 1, pattern);`,
};

async function runMysql(query) {
    try {
        const { stdout, stderr } = await execFileAsync("mysql", [
            "-u", "root",
            "-D", "chat_db",
            "-e", query,
            "--table",
        ], { timeout: 10_000 });
        return (stdout + stderr).trim();
    } catch (err) {
        return `오류: ${err.stderr || err.message}`;
    }
}

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("c-chat-db: DB 스키마 & 쿼리 도구 로드됨", { ephemeral: true });
        },
    },
    tools: [
        {
            name: "get_table_ddl",
            description: "chat_db 특정 테이블의 DDL 및 컬럼 설명 반환 (docs에서 읽음)",
            parameters: {
                type: "object",
                properties: {
                    table: {
                        type: "string",
                        description: "테이블 이름: users, user_settings, friends, rooms, room_members, messages, dm_reads, room_invites",
                    },
                },
                required: ["table"],
            },
            handler: async ({ table }) => {
                const file = TABLE_FILES[table];
                if (!file) {
                    return `알 수 없는 테이블: ${table}\n사용 가능: ${Object.keys(TABLE_FILES).join(", ")}`;
                }
                const content = await readDocFile(`${DOCS_DB}/${file}`);
                return content ?? `테이블 문서를 찾을 수 없음: ${file}`;
            },
        },
        {
            name: "get_er_diagram",
            description: "chat_db 전체 ER 다이어그램 (Mermaid) 반환",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const content = await readDocFile(`${DOCS_DB}/er_diagram.md`);
                return content ?? "ER 다이어그램 문서를 찾을 수 없음";
            },
        },
        {
            name: "get_query_example",
            description: "특정 기능의 Prepared Statement 예시 코드 반환",
            parameters: {
                type: "object",
                properties: {
                    feature: {
                        type: "string",
                        description: "기능명: login, register, friend_list, room_members, chat_history, user_search",
                    },
                },
                required: ["feature"],
            },
            handler: async ({ feature }) => {
                const example = QUERY_EXAMPLES[feature];
                if (!example) {
                    return `알 수 없는 기능: ${feature}\n사용 가능: ${Object.keys(QUERY_EXAMPLES).join(", ")}`;
                }
                return `### ${feature} 쿼리 예시\n\n\`\`\`c\n${example}\n\`\`\`\n\n> 모든 쿼리는 Prepared Statement 사용 필수. sprintf로 SQL 구성 금지.`;
            },
        },
        {
            name: "run_mysql_query",
            description: "chat_db에 대해 SELECT 쿼리 실행 (mysql CLI 사용, root 계정, 읽기 전용 권장)",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "실행할 SQL (SELECT 권장)" },
                },
                required: ["query"],
            },
            handler: async ({ query }) => {
                if (/^\s*(DROP|TRUNCATE|DELETE\s+FROM\s+users|DROP\s+DATABASE)/i.test(query)) {
                    return "❌ 위험한 쿼리는 차단됩니다. mysql CLI를 직접 사용하세요.";
                }
                return await runMysql(query);
            },
        },
        {
            name: "get_schema_init_guide",
            description: "chat_db 초기화 절차 및 sql/schema.sql 실행 방법 반환",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const content = await readDocFile(`${DOCS_DB}/migration_and_seed.md`);
                return content ?? `DB 초기화:\n\nmysql -u root -p < ${PROJECT_ROOT}/sql/schema.sql`;
            },
        },
    ],
});
