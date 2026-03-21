mod audio;

use audio::{start_audio_capture, stop_audio_capture, AudioState};
use enigo::{Enigo, Key, Keyboard, Settings};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use std::sync::Mutex;
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};
use tauri_plugin_positioner::{Position, WindowExt};

// 存储当前已注册的快捷键字符串
pub struct ActiveShortcut(Mutex<String>);

#[tauri::command]
fn update_shortcut(
    app: tauri::AppHandle,
    state: tauri::State<'_, ActiveShortcut>,
    new_shortcut: String,
) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    let old = state.0.lock().map_err(|e| e.to_string())?.clone();

    // 先注销旧的
    let _ = app.global_shortcut().unregister(old.as_str());

    // 尝试注册新的（失败 = 冲突）
    if let Err(e) = app.global_shortcut().register(new_shortcut.as_str()) {
        // 注册失败时尝试恢复旧快捷键
        let _ = app.global_shortcut().register(old.as_str());
        return Err(format!("快捷键注册失败: {}", e));
    }

    // 更新状态
    *state.0.lock().map_err(|e| e.to_string())? = new_shortcut;
    Ok(())
}

#[tauri::command]
async fn simulate_paste() -> Result<(), String> {
    // enigo 操作需要在同步上下文执行
    tokio::task::spawn_blocking(|| {
        let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Enigo init error: {e}"))?;
        enigo
            .key(Key::Control, enigo::Direction::Press)
            .map_err(|e| format!("Key press error: {e}"))?;
        enigo
            .key(Key::Unicode('v'), enigo::Direction::Click)
            .map_err(|e| format!("Key click error: {e}"))?;
        enigo
            .key(Key::Control, enigo::Direction::Release)
            .map_err(|e| format!("Key release error: {e}"))?;
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))??;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let audio_state = audio::new_audio_state();

    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .manage(audio_state)
        .manage(ActiveShortcut(Mutex::new("Ctrl+Shift+V".into())))
        .invoke_handler(tauri::generate_handler![
            simulate_paste,
            start_audio_capture,
            stop_audio_capture,
            update_shortcut,
        ])
        .setup(|app| {
            use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

            let app_handle = app.handle().clone();

            // 使用全局快捷键处理器
            app.global_shortcut().on_shortcut(
                Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyV),
                move |_app, _shortcut, event| {
                    match event.state() {
                        ShortcutState::Pressed => {
                            if let Some(win) = app_handle.get_webview_window("mic-indicator") {
                                let _ = win.move_window(Position::BottomCenter);
                                let _ = win.show();
                            }
                            let _ = app_handle.emit("shortcut-pressed", ());
                        }
                        ShortcutState::Released => {
                            let _ = app_handle.emit("shortcut-released", ());
                        }
                    }
                },
            ).map_err(|e| format!("Failed to register shortcut: {e}"))?;

            // 配置系统托盘
            let settings_item =
                MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit_item =
                MenuItem::with_id(app, "quit", "退出 WisFlow", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("WisFlow - 按 Ctrl+Shift+V 开始录音")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
