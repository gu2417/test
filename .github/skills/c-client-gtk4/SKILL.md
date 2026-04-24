---
name: c-client-gtk4
description: GTK4 C 클라이언트 개발 스킬. GtkStack 화면 전환, recv 스레드 → g_idle_add 패턴, CSS 테마 적용, 위젯 구조 가이드. GTK4 UI 코드 작성 시 사용.
---

# GTK4 C 클라이언트 구현 가이드

## 핵심 원칙: 스레드 안전성

GTK4는 **메인 루프(GTK main thread)에서만 UI 수정** 가능.
recv 스레드에서 직접 호출하면 assertion failure 또는 segfault.

```c
/* ❌ 절대 금지: recv 스레드에서 widget 직접 수정 */
static void *recv_thread(void *arg) {
    // ...
    gtk_text_buffer_insert(buf, &iter, msg, -1);  // CRASH!
}

/* ✅ 올바른 패턴: g_idle_add로 메인 루프에 위임 */
typedef struct { GtkTextBuffer *buf; char *text; } AppendData;

static gboolean append_message_cb(gpointer data) {
    AppendData *d = data;
    GtkTextIter end;
    gtk_text_buffer_get_end_iter(d->buf, &end);
    gtk_text_buffer_insert(d->buf, &end, d->text, -1);
    g_free(d->text);
    g_free(d);
    return G_SOURCE_REMOVE;  // 한 번만 실행 후 제거
}

static void *recv_thread(void *arg) {
    // ...
    AppendData *d = g_new(AppendData, 1);
    d->buf  = app->chat_buf;
    d->text = g_strdup(msg);
    g_idle_add(append_message_cb, d);  // 메인 루프에 위임
}
```

## 화면 구조 (GtkStack)

```c
/* app_context.h */
typedef struct {
    GtkApplication *app;
    GtkWidget      *window;
    GtkStack       *stack;          // 화면 전환 컨테이너
    /* 로그인 화면 */
    GtkEntry       *entry_username;
    GtkEntry       *entry_password;
    /* 메인 화면 */
    GtkListBox     *list_rooms;
    GtkListBox     *list_friends;
    /* 채팅 화면 */
    GtkTextView    *textview_chat;
    GtkTextBuffer  *chat_buf;
    GtkEntry       *entry_msg;
    /* 소켓 */
    int             sock_fd;
    pthread_t       recv_tid;
} AppContext;

/* 화면 전환 */
gtk_stack_set_visible_child_name(app->stack, "main");   // 메인 화면으로
gtk_stack_set_visible_child_name(app->stack, "chat");   // 채팅 화면으로
gtk_stack_set_visible_child_name(app->stack, "login");  // 로그인 화면으로
```

## 화면 파일 역할

| 파일 | 담당 | 주요 위젯 |
|------|------|----------|
| `screen_login.c` | 로그인/회원가입 UI | entry_username, entry_password, btn_login |
| `screen_main.c` | 채팅 목록 + 친구 목록 탭 | list_rooms, list_friends, btn_new_room |
| `screen_chat.c` | 채팅 메시지 + 입력창 | textview_chat, entry_msg, btn_send |
| `screen_settings.c` | 프로필/알림 설정 | entry_nickname, switch_dnd |
| `notify.c` | 알림 배너 오버레이 | GtkOverlay, GtkRevealer |

## CSS 테마 적용

```c
void apply_css_theme(const char *theme_path) {
    GtkCssProvider *provider = gtk_css_provider_new();
    gtk_css_provider_load_from_path(provider, theme_path);
    gtk_style_context_add_provider_for_display(
        gdk_display_get_default(),
        GTK_STYLE_PROVIDER(provider),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION
    );
    g_object_unref(provider);
}
// 사용: apply_css_theme("client/css/theme-dark.css");
```

## 빌드 플래그

```makefile
GTK_FLAGS = $(shell pkg-config --cflags gtk4)
GTK_LIBS  = $(shell pkg-config --libs gtk4)
CLIENT_FLAGS = -std=c11 -Wall -Wextra $(GTK_FLAGS)
```

## 설계 문서

- UI 화면 흐름: `docs/06_ui_ux/screen_flow.md`
- 로그인 화면: `docs/06_ui_ux/screens/login.md`
- 채팅 화면: `docs/06_ui_ux/screens/chat.md`
- 알림: `docs/06_ui_ux/screens/notifications.md`
