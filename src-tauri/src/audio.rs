#[cfg(feature = "audio")]
mod audio_impl {
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
    use std::sync::{Arc, Mutex};
    use tauri::{AppHandle, Emitter};

    pub struct AudioState {
        pub stream: Option<Box<dyn StreamTrait>>,
    }

    // StreamTrait is not Send by default on some platforms, so we wrap it
    unsafe impl Send for AudioState {}
    unsafe impl Sync for AudioState {}

    pub fn new_audio_state() -> Arc<Mutex<AudioState>> {
        Arc::new(Mutex::new(AudioState { stream: None }))
    }

    pub async fn start_audio_capture_impl(
        app: AppHandle,
        state: Arc<Mutex<AudioState>>,
        sample_rate: Option<u32>,
        channels: Option<u16>,
        chunk_duration_ms: Option<u32>,
    ) -> Result<(), String> {
        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or("No input device available")?;

        let target_sample_rate = sample_rate.unwrap_or(16000);
        let target_channels = channels.unwrap_or(1);
        let chunk_ms = chunk_duration_ms.unwrap_or(100);

        let supported_configs = device
            .supported_input_configs()
            .map_err(|e| format!("Failed to get supported configs: {e}"))?;

        let config = supported_configs
            .filter(|c| c.channels() == target_channels)
            .find(|c| {
                c.min_sample_rate().0 <= target_sample_rate
                    && c.max_sample_rate().0 >= target_sample_rate
            })
            .map(|c| c.with_sample_rate(cpal::SampleRate(target_sample_rate)))
            .or_else(|| device.default_input_config().ok().map(|c| c.into()))
            .ok_or("No supported audio config found")?;

        let chunk_size = ((config.sample_rate().0 as u32
            * config.channels() as u32
            * chunk_ms)
            / 1000) as usize;
        let buffer: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
        let buffer_clone = buffer.clone();
        let app_clone = app.clone();

        let stream = device
            .build_input_stream(
                &config.config(),
                move |data: &[f32], _info: &cpal::InputCallbackInfo| {
                    let mut buf = buffer_clone.lock().unwrap();
                    buf.extend_from_slice(data);
                    while buf.len() >= chunk_size {
                        let chunk: Vec<f32> = buf.drain(..chunk_size).collect();
                        let _ = app_clone.emit("audio-chunk", chunk);
                    }
                },
                |err| eprintln!("Audio stream error: {err}"),
                None,
            )
            .map_err(|e| format!("Failed to build input stream: {e}"))?;

        stream
            .play()
            .map_err(|e| format!("Failed to start stream: {e}"))?;

        let mut audio_state = state.lock().map_err(|e| format!("Lock error: {e}"))?;
        audio_state.stream = Some(Box::new(stream));

        Ok(())
    }

    pub async fn stop_audio_capture_impl(state: Arc<Mutex<AudioState>>) -> Result<(), String> {
        let mut audio_state = state.lock().map_err(|e| format!("Lock error: {e}"))?;
        audio_state.stream = None;
        Ok(())
    }
}

#[cfg(not(feature = "audio"))]
mod audio_impl {
    use std::sync::{Arc, Mutex};

    pub struct AudioState {}

    unsafe impl Send for AudioState {}
    unsafe impl Sync for AudioState {}

    pub fn new_audio_state() -> Arc<Mutex<AudioState>> {
        Arc::new(Mutex::new(AudioState {}))
    }
}

pub use audio_impl::{new_audio_state, AudioState};

use std::sync::{Arc, Mutex};

#[tauri::command]
pub async fn start_audio_capture(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<AudioState>>>,
    sample_rate: Option<u32>,
    channels: Option<u16>,
    chunk_duration_ms: Option<u32>,
) -> Result<(), String> {
    #[cfg(feature = "audio")]
    {
        audio_impl::start_audio_capture_impl(
            app,
            state.inner().clone(),
            sample_rate,
            channels,
            chunk_duration_ms,
        )
        .await
    }
    #[cfg(not(feature = "audio"))]
    {
        let _ = (app, sample_rate, channels, chunk_duration_ms);
        Err("Audio capture not available in this build (missing 'audio' feature). Install libasound2-dev on Linux.".to_string())
    }
}

#[tauri::command]
pub async fn stop_audio_capture(
    state: tauri::State<'_, Arc<Mutex<AudioState>>>,
) -> Result<(), String> {
    #[cfg(feature = "audio")]
    {
        audio_impl::stop_audio_capture_impl(state.inner().clone()).await
    }
    #[cfg(not(feature = "audio"))]
    {
        let _ = state;
        Ok(())
    }
}
