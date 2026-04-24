import { joinSession } from "@github/copilot-sdk/extension";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir } from "node:fs/promises";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = new URL("../../../", import.meta.url).pathname.replace(/\/$/, "");
const SRC = `${PROJECT_ROOT}/chat_program/src`;

async function run(cmd, args, opts = {}) {
    try {
        const { stdout, stderr } = await execFileAsync(cmd, args, {
            cwd: PROJECT_ROOT,
            timeout: 60_000,
            ...opts,
        });
        return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (err) {
        return {
            success: false,
            stdout: (err.stdout ?? "").trim(),
            stderr: (err.stderr ?? "").trim(),
            code: err.code,
        };
    }
}

async function collectCFiles(dir, exts = [".c", ".h"]) {
    const result = await run("find", [dir, "-type", "f", "(", "-name", "*.c", "-o", "-name", "*.h", ")"]);
    if (!result.success || !result.stdout) return [];
    return result.stdout.split("\n").filter(Boolean);
}

function parseCppcheckOutput(output) {
    // 형식: [파일:줄]: (심각도) 메시지 [id]
    const lines = output.split("\n").filter(l => l.startsWith("[") || /^\[/.test(l));
    const grouped = {};
    for (const line of lines) {
        const m = line.match(/^\[([^\]]+):(\d+)\]:\s+\((\w+)\)\s+(.+)$/);
        if (!m) continue;
        const [, file, lineNum, severity, msg] = m;
        const rel = file.replace(`${SRC}/`, "");
        if (!grouped[rel]) grouped[rel] = [];
        const icon = severity === "error" ? "🔴" : severity === "warning" ? "🟡" : "🔵";
        grouped[rel].push(`  ${icon} 줄 ${lineNum} [${severity}]: ${msg}`);
    }
    return grouped;
}

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("c-chat-lint: 정적 분석 도구 로드됨", { ephemeral: true });
        },
    },
    tools: [
        {
            name: "run_cppcheck",
            description: "cppcheck 정적 분석 실행. --enable=all로 버그/보안/스타일/미사용 코드 모두 검사",
            parameters: {
                type: "object",
                properties: {
                    target: {
                        type: "string",
                        description: "검사 대상: 'server', 'client', 'common', 'all' (기본: all)",
                    },
                    severity_filter: {
                        type: "string",
                        description: "최소 심각도 필터: 'error', 'warning', 'style', 'all' (기본: warning)",
                    },
                },
            },
            handler: async ({ target = "all", severity_filter = "warning" }) => {
                const targetDir = target === "all" ? SRC : `${SRC}/${target}`;
                const suppressFile = `${PROJECT_ROOT}/.cppcheck-suppress`;

                const args = [
                    `--enable=all`,
                    `--std=c11`,
                    "--language=c",
                    `--suppressions-list=${suppressFile}`,
                    "--error-exitcode=1",
                    `--severity=${severity_filter === "all" ? "error,warning,style,performance,portability,information" : severity_filter}`,
                    "--quiet",
                    targetDir,
                ];

                const result = await run("cppcheck", args);
                const allOutput = (result.stdout + "\n" + result.stderr).trim();

                if (!allOutput) {
                    return `✅ cppcheck 통과 — ${target} 대상에서 이슈 없음 (${severity_filter} 이상)`;
                }

                const grouped = parseCppcheckOutput(allOutput);
                const fileCount = Object.keys(grouped).length;
                const totalIssues = Object.values(grouped).flat().length;

                if (fileCount === 0) {
                    return `✅ cppcheck 통과 — ${target} 대상\n\n원시 출력:\n${allOutput.substring(0, 500)}`;
                }

                const lines = [`## cppcheck 결과 (${fileCount}개 파일, ${totalIssues}개 이슈)\n`];
                for (const [file, issues] of Object.entries(grouped)) {
                    lines.push(`### ${file}\n${issues.join("\n")}`);
                }
                lines.push("\n> 이슈 억제가 필요한 false-positive는 .cppcheck-suppress에 추가하세요.");
                return lines.join("\n");
            },
        },
        {
            name: "run_clang_format_check",
            description: "clang-format --dry-run으로 포맷 위반 검출 (파일 수정 없음). .clang-format 설정 기준",
            parameters: {
                type: "object",
                properties: {
                    target: {
                        type: "string",
                        description: "검사 대상 디렉터리 (기본: 전체 chat_program/src)",
                    },
                },
            },
            handler: async ({ target = "" }) => {
                const dir = target ? `${SRC}/${target}` : SRC;
                const filesResult = await run("find", [dir, "-name", "*.c", "-o", "-name", "*.h"]);
                const files = filesResult.stdout.split("\n").filter(Boolean);

                if (files.length === 0) return "검사할 .c/.h 파일 없음";

                const violations = [];
                for (const file of files.slice(0, 50)) {
                    const r = await run("clang-format", ["--dry-run", "--Werror", file]);
                    if (!r.success) {
                        const relPath = file.replace(`${SRC}/`, "");
                        violations.push(`🔴 ${relPath}\n  ${r.stderr.split("\n").slice(0, 3).join("\n  ")}`);
                    }
                }

                if (violations.length === 0) {
                    return `✅ clang-format 검사 통과 — ${files.length}개 파일 모두 .clang-format 기준 충족`;
                }
                return `## clang-format 위반 (${violations.length}/${files.length}개 파일)\n\n${violations.join("\n\n")}\n\n> \`run_clang_format_fix\` 툴로 자동 수정 가능합니다.`;
            },
        },
        {
            name: "run_clang_format_fix",
            description: "clang-format -i 로 .c/.h 파일 포맷 자동 수정 (in-place). 커밋 전 실행 권장",
            parameters: {
                type: "object",
                properties: {
                    target: {
                        type: "string",
                        description: "수정 대상 디렉터리 또는 파일 (기본: 전체 chat_program/src)",
                    },
                    dry_run: {
                        type: "boolean",
                        description: "true면 실제 수정 안 함 (기본: false)",
                    },
                },
            },
            handler: async ({ target = "", dry_run = false }) => {
                const dir = target ? `${SRC}/${target}` : SRC;
                const filesResult = await run("find", [dir, "-name", "*.c", "-o", "-name", "*.h"]);
                const files = filesResult.stdout.split("\n").filter(Boolean);

                if (files.length === 0) return "수정할 .c/.h 파일 없음";
                if (dry_run) return `dry_run 모드: ${files.length}개 파일이 수정 대상입니다.\nrun_clang_format_fix를 dry_run: false로 실행하면 실제 수정됩니다.`;

                const fixed = [];
                const failed = [];
                for (const file of files) {
                    const r = await run("clang-format", ["-i", "--style=file", file]);
                    const rel = file.replace(`${SRC}/`, "");
                    if (r.success) fixed.push(rel);
                    else failed.push(`${rel}: ${r.stderr}`);
                }

                const lines = [`✅ clang-format 적용 완료 (${fixed.length}/${files.length}개 파일)`];
                if (failed.length > 0) {
                    lines.push(`\n❌ 실패 (${failed.length}개):\n${failed.map(f => `  - ${f}`).join("\n")}`);
                }
                return lines.join("\n");
            },
        },
        {
            name: "check_compiler_warnings",
            description: "gcc -Wall -Wextra -Wshadow 경고 수준으로 컴파일 경고 리포트 생성 (링크 없이 -fsyntax-only)",
            parameters: {
                type: "object",
                properties: {
                    file: {
                        type: "string",
                        description: "검사할 .c 파일 경로 (chat_program/src/ 기준, 기본: 전체 서버 소스)",
                    },
                },
            },
            handler: async ({ file = "" }) => {
                let targetFiles;
                if (file) {
                    targetFiles = [`${SRC}/${file}`];
                } else {
                    const r = await run("find", [SRC, "-name", "*.c"]);
                    targetFiles = r.stdout.split("\n").filter(Boolean).slice(0, 20);
                }

                const CFLAGS = [
                    "-std=c11", "-fsyntax-only",
                    "-Wall", "-Wextra", "-Wshadow",
                    "-Wno-unused-result", "-Wno-format-truncation",
                    "-I", `${SRC}/common`,
                ];

                const warnings = [];
                for (const f of targetFiles) {
                    const r = await run("gcc", [...CFLAGS, f]);
                    if (r.stderr) {
                        const rel = f.replace(`${SRC}/`, "");
                        const lines = r.stderr.split("\n").filter(l => l.includes("warning:") || l.includes("error:"));
                        if (lines.length > 0) {
                            warnings.push(`### ${rel}\n${lines.slice(0, 10).map(l => `  ${l}`).join("\n")}`);
                        }
                    }
                }

                if (warnings.length === 0) return `✅ 컴파일러 경고 없음 (${targetFiles.length}개 파일, -Wall -Wextra -Wshadow)`;
                return `## 컴파일러 경고 (${warnings.length}개 파일)\n\n${warnings.join("\n\n")}`;
            },
        },
        {
            name: "check_unused_code",
            description: "cppcheck unusedFunction/unusedVariable/unusedStructMember만 필터링해 미사용 코드 리포트",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const suppressFile = `${PROJECT_ROOT}/.cppcheck-suppress`;
                const result = await run("cppcheck", [
                    "--enable=unusedFunction,style",
                    "--std=c11",
                    "--language=c",
                    `--suppressions-list=${suppressFile}`,
                    "--quiet",
                    SRC,
                ]);

                const output = (result.stdout + "\n" + result.stderr).trim();
                const unusedLines = output.split("\n").filter(l =>
                    l.includes("unusedFunction") || l.includes("unusedVariable") ||
                    l.includes("unusedStructMember") || l.includes("unusedPrivateFunction")
                );

                if (unusedLines.length === 0) {
                    return "✅ 미사용 코드 없음 (cppcheck unusedFunction/Variable/StructMember 기준)";
                }

                const formatted = unusedLines.map(l => {
                    const m = l.match(/^\[([^\]]+):(\d+)\]:\s+\(\w+\)\s+(.+)$/);
                    if (!m) return `  ${l}`;
                    const [, file, lineNum, msg] = m;
                    return `  🟡 ${file.replace(`${SRC}/`, "")}:${lineNum} — ${msg}`;
                });

                return `## 미사용 코드 (${unusedLines.length}개)\n\n${formatted.join("\n")}\n\n> 사용하지 않는 코드는 제거하거나 TODO 주석을 달아 관리하세요.`;
            },
        },
    ],
});
