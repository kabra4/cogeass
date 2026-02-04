use crate::network::http_handler::HttpHandler;
use crate::network::session::{SessionConfig, SessionEvent, SessionManager, SessionProtocol};
use crate::network::sse_handler::SseHandler;
use serde::Serialize;
use tauri::Emitter;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
struct SessionEventPayload {
    session_id: String,
    event: SessionEvent,
}

#[tauri::command]
pub async fn open_session(
    app: tauri::AppHandle,
    state: tauri::State<'_, SessionManager>,
    config: SessionConfig,
) -> Result<String, String> {
    let session_id = Uuid::new_v4().to_string();

    let mut handler: Box<dyn crate::network::session::SessionHandler> = match config.protocol {
        SessionProtocol::Http => Box::new(HttpHandler::new()),
        SessionProtocol::Sse => Box::new(SseHandler::new()),
        SessionProtocol::WebSocket => {
            return Err("WebSocket protocol not yet implemented".to_string())
        }
        SessionProtocol::Grpc => return Err("gRPC protocol not yet implemented".to_string()),
    };

    let (event_tx, mut event_rx) = tokio::sync::mpsc::channel::<SessionEvent>(256);

    // Open the session handler
    handler.open(config, event_tx).await?;

    // Store the handler
    state.insert(session_id.clone(), handler).await;

    // Spawn event forwarding task
    let sid = session_id.clone();
    let app_handle = app.clone();
    tokio::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            let payload = SessionEventPayload {
                session_id: sid.clone(),
                event,
            };
            let _ = app_handle.emit(&format!("session:{}", sid), &payload);
        }
    });

    Ok(session_id)
}

#[tauri::command]
pub async fn close_session(
    state: tauri::State<'_, SessionManager>,
    session_id: String,
) -> Result<(), String> {
    if let Some(mut handler) = state.remove(&session_id).await {
        handler.close().await?;
    }
    Ok(())
}

#[tauri::command]
pub async fn send_message(
    state: tauri::State<'_, SessionManager>,
    session_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    state.send_to(&session_id, data).await
}
