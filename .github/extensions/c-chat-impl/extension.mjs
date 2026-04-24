import { joinSession } from "@github/copilot-sdk/extension";
import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const PROJECT_ROOT = new URL("../../../", import.meta.url).pathname.replace(/\/$/, "");
const DOCS = `${PROJECT_ROOT}/docs`;
const SRC = `${PROJECT_ROOT}/chat_program/src`;

async function readDoc(relPath) {
    try {
        return await readFile(`${DOCS}/${relPath}`, "utf8");
    } catch {
        return null;
    }
}

async function fileExists(absPath) {
    try {
        await access(absPath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function readSrcFile(relPath) {
    try {
        return await readFile(`${SRC}/${relPath}`, "utf8");
    } catch {
        return null;
    }
}

const PHASE_FILES = {
    phase0: "10_todo_list/phase0_foundation.md",
    phase1: "10_todo_list/phase1_p0_core.md",
    phase2: "10_todo_list/phase2_p1_social.md",
    phase3: "10_todo_list/phase3_p2_enhance.md",
    phase4: "10_todo_list/phase4_p3_advanced.md",
    cross: "10_todo_list/cross_cutting.md",
};

const MODULE_DOCS = {
    // 서버
    "server/auth": { file: "02_features/account.md", desc: "인증 모듈 (회원가입/로그인/로그아웃)" },
    "server/friend": { file: "02_features/friend.md", desc: "친구 관리 모듈" },
    "server/room": { file: "02_features/group_room.md", desc: "그룹/오픈 채팅방 모듈" },
    "server/dm": { file: "02_features/dm.md", desc: "1:1 DM 모듈" },
    "server/message": { file: "02_features/message.md", desc: "메시지 처리 모듈" },
    "server/broadcast": { file: "03_architecture/data_flow.md", desc: "브로드캐스트/알림 모듈" },
    "server/db": { file: "07_database/connection_pooling.md", desc: "MySQL 연결 풀/Prepared Statement" },
    "server/globals": { file: "03_architecture/threading_model.md", desc: "전역 세션 배열 + Mutex" },
    "server/router": { file: "04_file_structure/server_modules.md", desc: "패킷 타입 → 핸들러 디스패치" },
    // 클라이언트
    "client/net": { file: "03_architecture/threading_model.md", desc: "TCP 연결/send/recv 스레드" },
    "client/packet": { file: "08_api/packet_format.md", desc: "패킷 직렬화/파싱" },
    "client/screen_login": { file: "06_ui_ux/screens/login.md", desc: "로그인/회원가입 화면" },
    "client/screen_main": { file: "06_ui_ux/screen_flow.md", desc: "메인화면 탭 구조" },
    "client/screen_chat": { file: "06_ui_ux/screens/chat.md", desc: "채팅화면 위젯 구조" },
    "client/notify": { file: "06_ui_ux/screens/notifications.md", desc: "알림 배너/배지" },
    // 공통
    "common/protocol": { file: "08_api/packet_format.md", desc: "패킷 타입 상수 (protocol.h)" },
    "common/types": { file: "04_file_structure/common_modules.md", desc: "공유 구조체 (types.h)" },
    "common/utils": { file: "04_file_structure/common_modules.md", desc: "유틸리티 함수 (utils.c/h)" },
    "common/net_compat": { file: "03_architecture/build_and_portability.md", desc: "플랫폼 소켓 호환 레이어" },
    // DB
    "db/schema": { file: "07_database/er_diagram.md", desc: "전체 DB 스키마/ERD" },
    "db/query": { file: "07_database/query_catalog.md", desc: "쿼리 카탈로그" },
};

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("c-chat-impl: 구현 가이드 에이전트 로드됨", { ephemeral: true });
        },
    },
    tools: [
        {
            name: "get_todo_phase",
            description: "특정 구현 Phase의 TODO 항목 전체 반환 (구현 파일 경로, 수용 기준 포함)",
            parameters: {
                type: "object",
                properties: {
                    phase: {
                        type: "string",
                        description: "phase0 (기반), phase1 (P0 핵심), phase2 (P1 소셜), phase3 (P2 향상), phase4 (P3 고급), cross (보안/예외)",
                    },
                },
                required: ["phase"],
            },
            handler: async ({ phase }) => {
                const file = PHASE_FILES[phase];
                if (!file) {
                    return `알 수 없는 phase: ${phase}\n사용 가능: ${Object.keys(PHASE_FILES).join(", ")}`;
                }
                const content = await readDoc(file);
                return content ?? `TODO 파일을 찾을 수 없음: ${file}`;
            },
        },
        {
            name: "get_module_spec",
            description: "특정 모듈의 설계 명세 반환 (기능 요구사항, 함수 시그니처, 의존성)",
            parameters: {
                type: "object",
                properties: {
                    module: {
                        type: "string",
                        description: "모듈 경로 예: server/auth, client/net, common/protocol, db/schema 등",
                    },
                },
                required: ["module"],
            },
            handler: async ({ module }) => {
                const info = MODULE_DOCS[module];
                if (!info) {
                    const available = Object.entries(MODULE_DOCS)
                        .map(([k, v]) => `  ${k}: ${v.desc}`)
                        .join("\n");
                    return `알 수 없는 모듈: ${module}\n\n사용 가능 모듈:\n${available}`;
                }
                const content = await readDoc(info.file);
                if (!content) {
                    return `설계 문서를 찾을 수 없음: ${info.file}\n모듈: ${module} (${info.desc})`;
                }
                return `# ${module} — ${info.desc}\n\n${content}`;
            },
        },
        {
            name: "get_design_doc",
            description: "docs/ 내 특정 설계 문서 파일 내용 반환",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "docs/ 기준 상대 경로 (예: 03_architecture/threading_model.md)",
                    },
                },
                required: ["path"],
            },
            handler: async ({ path }) => {
                const content = await readDoc(path);
                return content ?? `설계 문서를 찾을 수 없음: docs/${path}`;
            },
        },
        {
            name: "check_file_status",
            description: "구현 파일 존재 여부와 현재 내용(처음 50줄) 확인",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "chat_program/src/ 기준 상대 경로 (예: common/protocol.h, server/auth.c)",
                    },
                },
                required: ["path"],
            },
            handler: async ({ path }) => {
                const exists = await fileExists(`${SRC}/${path}`);
                if (!exists) {
                    return `❌ 파일 없음: chat_program/src/${path}\n→ 아직 구현되지 않은 파일입니다.`;
                }
                const content = await readSrcFile(path);
                if (!content) return `✅ 파일 존재하지만 읽기 실패: ${path}`;
                const lines = content.split("\n");
                const preview = lines.slice(0, 50).join("\n");
                const more = lines.length > 50 ? `\n\n... (${lines.length - 50}줄 더 있음)` : "";
                return `✅ 파일 존재: chat_program/src/${path} (${lines.length}줄)\n\n\`\`\`c\n${preview}${more}\n\`\`\``;
            },
        },
        {
            name: "list_implemented_files",
            description: "현재 구현된 소스 파일 목록 조회 (chat_program/src/ 전체)",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const { execFile } = await import("node:child_process");
                const { promisify } = await import("node:util");
                const execAsync = promisify(execFile);
                try {
                    const { stdout } = await execAsync("find", [
                        `${SRC}`, "-type", "f", "(", "-name", "*.c", "-o", "-name", "*.h", ")",
                    ]);
                    const files = stdout.trim().split("\n")
                        .map(f => f.replace(`${SRC}/`, ""))
                        .sort();
                    if (files.length === 0 || (files.length === 1 && files[0] === "")) {
                        return "아직 구현된 소스 파일 없음. Phase 0부터 시작하세요.\n\n참고: get_todo_phase 툴로 phase0 확인";
                    }
                    return `구현된 파일 (${files.length}개):\n\n${files.map(f => `  - ${f}`).join("\n")}`;
                } catch {
                    return "파일 목록 조회 실패";
                }
            },
        },
    ],
});
