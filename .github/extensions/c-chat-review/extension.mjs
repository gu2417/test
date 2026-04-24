import { joinSession } from "@github/copilot-sdk/extension";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = new URL("../../../", import.meta.url).pathname.replace(/\/$/, "");
const SRC = `${PROJECT_ROOT}/chat_program/src`;

async function runCommand(cmd, args, options = {}) {
    try {
        const { stdout, stderr } = await execFileAsync(cmd, args, {
            cwd: PROJECT_ROOT,
            timeout: 60_000,
            ...options,
        });
        return { success: true, output: (stdout + stderr).trim() };
    } catch (err) {
        return { success: false, output: (err.stdout + err.stderr || err.message).trim() };
    }
}

const SECURITY_PATTERNS = [
    { pattern: /sprintf\s*\([^;]*,\s*"[^"]*%[sd][^"]*"[^;]*user|sprintf\s*\([^;]*sql/gi, issue: "SQL sprintf 패턴 (SQL Injection 위험)", severity: "🔴 HIGH" },
    { pattern: /mysql_query\s*\([^;]*[^?]/gi, issue: "raw mysql_query 사용 (Prepared Statement 미사용)", severity: "🔴 HIGH" },
    { pattern: /strncpy\s*\(/gi, issue: "strncpy 사용 (NUL 종료 보장 안 됨 → safe_strncpy 사용)", severity: "🟡 MEDIUM" },
    { pattern: /gets\s*\(/gi, issue: "gets() 사용 금지 (버퍼 오버플로)", severity: "🔴 HIGH" },
    { pattern: /strcpy\s*\(/gi, issue: "strcpy 사용 (크기 미검사 → strncpy/safe_strncpy)", severity: "🟡 MEDIUM" },
    { pattern: /password[^_]\s*=\s*"[^"]+"/gi, issue: "비밀번호 하드코딩 의심", severity: "🔴 HIGH" },
];

const GTK4_THREAD_PATTERNS = [
    { pattern: /gtk_[a-z_]+set[a-z_]*\s*\(/gi, issue: "recv 스레드에서 GTK widget 수정 가능성 → g_idle_add() 확인 필요", severity: "🟡 MEDIUM" },
    { pattern: /gtk_text_buffer_insert|gtk_list_box_append|gtk_label_set_text/gi, issue: "GTK UI API 직접 호출 — recv 스레드 여부 확인", severity: "🟡 MEDIUM" },
];

const MUTEX_PATTERNS = [
    { pattern: /pthread_mutex_lock[^{]*{[^}]*(send\s*\(|mysql_stmt_execute|db_execute)/gs, issue: "Mutex 보유 중 send()/DB 호출 의심 (데드락 위험)", severity: "🔴 HIGH" },
];

function scanCode(content, patterns) {
    const findings = [];
    for (const { pattern, issue, severity } of patterns) {
        const matches = [...content.matchAll(pattern)];
        if (matches.length > 0) {
            const lines = content.split("\n");
            for (const m of matches.slice(0, 5)) {
                const lineNum = content.substring(0, m.index).split("\n").length;
                const line = lines[lineNum - 1]?.trim() ?? "";
                findings.push(`${severity} ${issue}\n  줄 ${lineNum}: \`${line.substring(0, 80)}\``);
            }
        }
    }
    return findings;
}

async function getSourceFiles(subdir = "") {
    const dir = subdir ? `${SRC}/${subdir}` : SRC;
    const result = await runCommand("find", [dir, "-name", "*.c", "-o", "-name", "*.h"]);
    if (!result.success) return [];
    return result.output.split("\n").filter(Boolean);
}

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("c-chat-review: 코드 리뷰 도구 로드됨", { ephemeral: true });
        },
    },
    tools: [
        {
            name: "check_security",
            description: "보안 패턴 검사: SQL Injection (sprintf SQL, raw mysql_query), 버퍼 오버플로 (strcpy/gets), 비밀번호 하드코딩",
            parameters: {
                type: "object",
                properties: {
                    target: {
                        type: "string",
                        description: "검사 대상: 'server', 'client', 'common', 또는 특정 파일 경로 (chat_program/src/ 기준)",
                    },
                },
                required: ["target"],
            },
            handler: async ({ target }) => {
                const files = ["server", "client", "common"].includes(target)
                    ? await getSourceFiles(target)
                    : [`${SRC}/${target}`];

                if (files.length === 0) return "검사할 파일 없음";

                const allFindings = [];
                for (const file of files.slice(0, 30)) {
                    let content;
                    try { content = await readFile(file, "utf8"); } catch { continue; }
                    const findings = scanCode(content, SECURITY_PATTERNS);
                    if (findings.length > 0) {
                        const relPath = file.replace(`${SRC}/`, "");
                        allFindings.push(`### ${relPath}\n${findings.join("\n")}`);
                    }
                }

                if (allFindings.length === 0) {
                    return `✅ 보안 검사 통과 — ${files.length}개 파일에서 알려진 패턴 없음\n\n⚠️ 자동 검사는 한계가 있습니다. 수동 리뷰도 병행하세요.`;
                }
                return `## 보안 이슈 발견 (${allFindings.length}개 파일)\n\n${allFindings.join("\n\n")}`;
            },
        },
        {
            name: "check_gtk4_thread_safety",
            description: "GTK4 스레드 안전성 검사: recv 스레드에서 g_idle_add() 없이 GTK widget API 직접 호출 여부",
            parameters: {
                type: "object",
                properties: {
                    file: {
                        type: "string",
                        description: "검사할 파일 경로 (chat_program/src/ 기준, 기본: client/net.c)",
                    },
                },
            },
            handler: async ({ file = "client/net.c" }) => {
                let content;
                try {
                    content = await readFile(`${SRC}/${file}`, "utf8");
                } catch {
                    return `파일을 찾을 수 없음: ${file}`;
                }

                const findings = scanCode(content, GTK4_THREAD_PATTERNS);
                const hasIdleAdd = /g_idle_add\s*\(/.test(content);
                const lines = content.split("\n").length;

                const result = [`# GTK4 스레드 안전성 검사: ${file} (${lines}줄)`];
                result.push(`\ng_idle_add() 사용: ${hasIdleAdd ? "✅ 있음" : "❌ 없음"}`);

                if (findings.length > 0) {
                    result.push("\n## 주의 필요 패턴");
                    result.push(findings.join("\n"));
                    result.push("\n> recv 스레드에서 GTK API 호출 시 반드시 g_idle_add()로 메인 루프에 위임하세요.");
                } else {
                    result.push("\n✅ 알려진 GTK 직접 호출 패턴 없음");
                }
                return result.join("\n");
            },
        },
        {
            name: "check_packet_validation",
            description: "패킷 파싱 후 필드 검증 코드 유무 검사: 수신 패킷의 필드 수/길이/타입 검증 여부",
            parameters: {
                type: "object",
                properties: {
                    file: {
                        type: "string",
                        description: "검사할 파일 (기본: server/router.c 또는 server/client_handler.c)",
                    },
                },
            },
            handler: async ({ file = "server/client_handler.c" }) => {
                let content;
                try {
                    content = await readFile(`${SRC}/${file}`, "utf8");
                } catch {
                    return `파일 없음: ${file}`;
                }

                const checks = [
                    { name: "패킷 파싱 (packet_parse)", pattern: /packet_parse\s*\(/, found: false },
                    { name: "필드 수 검증 (n < N)", pattern: /n\s*[<>=]+\s*\d+/, found: false },
                    { name: "길이 검증 (strlen)", pattern: /strlen\s*\(/, found: false },
                    { name: "NULL 검사", pattern: /==\s*NULL|!=\s*NULL/, found: false },
                    { name: "최대 크기 검사 (MAX_PACKET_SIZE)", pattern: /MAX_PACKET_SIZE/, found: false },
                    { name: "SERVER_ERROR 반환", pattern: /SERVER_ERROR/, found: false },
                ];

                for (const c of checks) {
                    c.found = c.pattern.test(content);
                }

                const results = checks.map(c => `${c.found ? "✅" : "❌"} ${c.name}`).join("\n");
                const missing = checks.filter(c => !c.found);

                return `# 패킷 검증 체크리스트: ${file}\n\n${results}\n\n${
                    missing.length > 0
                        ? `⚠️ 누락된 검증 (${missing.length}개):\n${missing.map(c => `  - ${c.name}`).join("\n")}`
                        : "✅ 모든 기본 검증 패턴 존재"
                }`;
            },
        },
        {
            name: "check_sql_injection_free",
            description: "서버 전체 소스에서 SQL Injection 위험 패턴 종합 검사 및 리포트",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const files = await getSourceFiles("server");
                const dangerous = [];
                const safe = [];

                for (const file of files) {
                    let content;
                    try { content = await readFile(file, "utf8"); } catch { continue; }
                    const relPath = file.replace(`${SRC}/`, "");
                    const hasRawSprintf = /sprintf[^;]*"[^"]*SELECT|sprintf[^;]*"[^"]*INSERT|sprintf[^;]*"[^"]*UPDATE/gi.test(content);
                    const hasRawQuery = /mysql_query\s*\([^;]+\)/gi.test(content);
                    const hasPrepared = /db_prepare|db_bind_str|db_bind_int/g.test(content);

                    if (hasRawSprintf || hasRawQuery) {
                        dangerous.push(`🔴 ${relPath} — raw SQL 패턴 발견`);
                    } else if (hasPrepared || !/SELECT|INSERT|UPDATE|DELETE/i.test(content)) {
                        safe.push(`✅ ${relPath}`);
                    }
                }

                const lines = ["# SQL Injection 검사 결과\n"];
                if (dangerous.length > 0) {
                    lines.push(`## ❌ 위험 패턴 (${dangerous.length}개)\n${dangerous.join("\n")}`);
                }
                lines.push(`\n## ✅ 안전 파일 (${safe.length}개)\n${safe.join("\n")}`);
                lines.push("\n> 모든 SQL은 db_prepare() + db_bind_str/int() 패턴만 사용해야 합니다.");
                return lines.join("\n");
            },
        },
    ],
});
