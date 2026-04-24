---
applyTo: "chat_program/src/client/**/*.c,chat_program/src/client/**/*.h"
---

# GTK4 클라이언트 코드 작성 지침

## GTK4 스레드 안전성 (가장 중요)

```c
// ❌ 절대 금지: recv 스레드에서 GTK widget 직접 수정
gtk_label_set_text(label, msg);  // 크래시 위험!

// ✅ 올바른 패턴: g_idle_add로 메인 루프에 위임
typedef struct { GtkWidget *widget; char *text; } IdleData;

static gboolean update_label_cb(gpointer user_data) {
    IdleData *d = user_data;
    gtk_label_set_text(GTK_LABEL(d->widget), d->text);
    g_free(d->text);
    g_free(d);
    return G_SOURCE_REMOVE;
}

// recv 스레드에서 호출:
IdleData *d = g_new(IdleData, 1);
d->widget = label;
d->text = g_strdup(msg);
g_idle_add(update_label_cb, d);
```

## 화면 구조 (GtkStack 탭)

| 화면 파일 | 탭 이름 | 전환 조건 |
|-----------|---------|----------|
| `screen_login.c` | `"login"` | 앱 시작 / 로그아웃 |
| `screen_main.c` | `"main"` | 로그인 성공 후 |
| `screen_chat.c` | `"chat"` | 방/DM 입장 시 |
| `screen_settings.c` | `"settings"` | 설정 탭 클릭 |

화면 전환: `gtk_stack_set_visible_child_name(stack, "main")`

## 위젯 명명 규칙

- 컨테이너: `box_`, `grid_`, `stack_` 접두사
- 입력: `entry_`, `textview_` 접두사
- 버튼: `btn_` 접두사
- 레이블: `lbl_` 접두사

## CSS 테마 로드

```c
GtkCssProvider *provider = gtk_css_provider_new();
gtk_css_provider_load_from_path(provider, "client/css/theme-dark.css");
gtk_style_context_add_provider_for_display(
    gdk_display_get_default(),
    GTK_STYLE_PROVIDER(provider),
    GTK_STYLE_PROVIDER_PRIORITY_APPLICATION
);
```

## 메모리 관리

- GLib 타입은 `g_free()`, C 표준 타입은 `free()` 구분
- GtkWidget은 부모 소멸 시 자동 해제 — 별도 free 금지
- `g_idle_add` 콜백의 user_data는 콜백 내부에서 `g_free`
