mod audio;

use audio::{start_audio_capture, stop_audio_capture, AudioState};
use enigo::{Enigo, Key, Keyboard, Settings};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

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
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .manage(audio_state)
        .invoke_handler(tauri::generate_handler![
            simulate_paste,
            start_audio_capture,
            stop_audio_capture,
        ])
        .setup(|app| {
            // 注册全局快捷键 Ctrl+Shift+V
            app.global_shortcut()
                .on_shortcut(
                    tauri_plugin_global_shortcut::Shortcut::new(
                        Some(Modifiers::CONTROL | Modifiers::SHIFT),
                        Code::KeyV,
                    ),
                    {
                        let app_handle = app.handle().clone();
                        move |_app, _shortcut, event| {
                            match event.state() {
                                ShortcutState::Pressed => {
                                    let _ = app_handle.emit("shortcut-pressed", ());
                                }
                                ShortcutState::Released => {
                                    let _ = app_handle.emit("shortcut-released", ());
                                }
                            }
                        }
                    },
                )
                .map_err(|e| format!("Failed to register shortcut: {e}"))?;

            // 配置系统托盘
            let quit_item = MenuItem::with_id(app, "quit", "退出 WisFlow", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("WisFlow - 按 Ctrl+Shift+V 开始录音")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
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
