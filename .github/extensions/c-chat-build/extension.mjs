import { joinSession } from "@github/copilot-sdk/extension";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = new URL("../../../", import.meta.url).pathname.replace(/\/$/, "");

async function runMake(target = "") {
    const args = target ? [target] : [];
    try {
        const { stdout, stderr } = await execFileAsync("make", args, {
            cwd: PROJECT_ROOT,
            timeout: 120_000,
        });
        return { success: true, output: (stdout + stderr).trim() };
    } catch (err) {
        return { success: false, output: err.stderr || err.message };
    }
}

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("c-chat-build: 빌드/실행 도구 로드됨", { ephemeral: true });
        },
    },
    tools: [
        {
            name: "build_all",
            description: "make 전체 빌드 (서버 + 클라이언트). GTK4, pthread, libmysqlclient 필요.",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const r = await runMake();
                return r.success
                    ? `✅ 빌드 성공\n\n${r.output}`
                    : `❌ 빌드 실패\n\n${r.output}`;
            },
        },
        {
            name: "build_server",
            description: "make server — 서버 바이너리(chat_server)만 빌드",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const r = await runMake("server");
                return r.success ? `✅ 서버 빌드 성공\n\n${r.output}` : `❌ 서버 빌드 실패\n\n${r.output}`;
            },
        },
        {
            name: "build_client",
            description: "make client — GTK4 클라이언트(chat_client)만 빌드",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const r = await runMake("client");
                return r.success ? `✅ 클라이언트 빌드 성공\n\n${r.output}` : `❌ 클라이언트 빌드 실패\n\n${r.output}`;
            },
        },
        {
            name: "clean_build",
            description: "make clean — 빌드 산출물(.o, 바이너리) 삭제",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const r = await runMake("clean");
                return r.success ? `✅ clean 완료` : `❌ clean 실패\n\n${r.output}`;
            },
        },
        {
            name: "run_server",
            description: "채팅 서버 실행 (백그라운드). 포트 기본값 8080.",
            parameters: {
                type: "object",
                properties: {
                    port: { type: "string", description: "리슨 포트 (기본: 8080)" },
                },
            },
            handler: async ({ port = "8080" }) => {
                const serverBin = `${PROJECT_ROOT}/chat_program/src/server/chat_server`;
                try {
                    const child = execFile(serverBin, [port], { cwd: PROJECT_ROOT });
                    child.unref();
                    return `🚀 서버 시작: ${serverBin} ${port}\nPID: ${child.pid}\n종료하려면 kill ${child.pid} 실행`;
                } catch (e) {
                    return `❌ 서버 실행 실패: ${e.message}\n먼저 build_server를 실행하세요.`;
                }
            },
        },
        {
            name: "run_client",
            description: "GTK4 채팅 클라이언트 실행 (백그라운드)",
            parameters: {
                type: "object",
                properties: {
                    host: { type: "string", description: "서버 호스트 (기본: 127.0.0.1)" },
                    port: { type: "string", description: "서버 포트 (기본: 8080)" },
                },
            },
            handler: async ({ host = "127.0.0.1", port = "8080" }) => {
                const clientBin = `${PROJECT_ROOT}/chat_program/src/client/chat_client`;
                try {
                    const child = execFile(clientBin, [host, port], { cwd: PROJECT_ROOT });
                    child.unref();
                    return `🖥️ 클라이언트 시작: ${clientBin} ${host} ${port}\nPID: ${child.pid}`;
                } catch (e) {
                    return `❌ 클라이언트 실행 실패: ${e.message}\n먼저 build_client를 실행하세요.`;
                }
            },
        },
    ],
});
