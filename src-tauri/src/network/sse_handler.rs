use super::session::{SessionConfig, SessionEvent, SessionHandler};
use futures::StreamExt;
use tokio::sync::mpsc;

pub struct SseHandler {
    abort_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl SseHandler {
    pub fn new() -> Self {
        Self { abort_tx: None }
    }
}

fn parse_sse_frame(frame: &str) -> (String, String, Option<String>) {
    let mut event_type = String::from("message");
    let mut data_lines: Vec<&str> = Vec::new();
    let mut id: Option<String> = None;

    for line in frame.lines() {
        if let Some(value) = line.strip_prefix("event:") {
            event_type = value.trim().to_string();
        } else if let Some(value) = line.strip_prefix("data:") {
            data_lines.push(value.strip_prefix(' ').unwrap_or(value));
        } else if let Some(value) = line.strip_prefix("id:") {
            id = Some(value.trim().to_string());
        } else if line.starts_with("retry:") {
            // SSE retry field — ignored
        }
    }

    let data = data_lines.join("\n");
    (event_type, data, id)
}

#[async_trait::async_trait]
impl SessionHandler for SseHandler {
    async fn open(
        &mut self,
        config: SessionConfig,
        event_tx: mpsc::Sender<SessionEvent>,
    ) -> Result<(), String> {
        let _ = event_tx
            .send(SessionEvent::Lifecycle {
                status: "connected".to_string(),
            })
            .await;

        let t0 = std::time::Instant::now();

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(600))
            .build()
            .map_err(|e| e.to_string())?;

        let method = config.method.to_uppercase();
        let mut request_builder = match method.as_str() {
            "GET" => client.get(&config.url),
            "POST" => client.post(&config.url),
            _ => client.get(&config.url),
        };

        for (key, value) in &config.headers {
            request_builder = request_builder.header(key, value);
        }

        if let Some(body_content) = &config.body {
            request_builder = request_builder.body(body_content.clone());
        }

        let prepare_ms = t0.elapsed().as_secs_f64() * 1000.0;
        let _ = event_tx
            .send(SessionEvent::Timing {
                phase: "prepare".to_string(),
                ms: prepare_ms,
            })
            .await;

        let t1 = std::time::Instant::now();
        let response = request_builder.send().await.map_err(|e| e.to_string())?;
        let ttfb_ms = t1.elapsed().as_secs_f64() * 1000.0;
        let _ = event_tx
            .send(SessionEvent::Timing {
                phase: "ttfb".to_string(),
                ms: ttfb_ms,
            })
            .await;

        let (abort_tx, mut abort_rx) = tokio::sync::oneshot::channel::<()>();
        self.abort_tx = Some(abort_tx);

        // Spawn stream reader task
        let stream_start = std::time::Instant::now();
        tokio::spawn(async move {
            let mut stream = response.bytes_stream();
            let mut buffer = String::new();

            loop {
                tokio::select! {
                    chunk = stream.next() => {
                        match chunk {
                            Some(Ok(bytes)) => {
                                let chunk_str = String::from_utf8_lossy(&bytes);
                                buffer.push_str(&chunk_str);

                                while let Some(pos) = buffer.find("\n\n") {
                                    let frame = buffer[..pos].to_string();
                                    buffer = buffer[pos + 2..].to_string();

                                    if frame.trim().is_empty() {
                                        continue;
                                    }

                                    let (event_type, data, id) = parse_sse_frame(&frame);

                                    if data.is_empty() {
                                        continue;
                                    }

                                    let _ = event_tx
                                        .send(SessionEvent::SseFrame {
                                            event_type,
                                            data,
                                            id,
                                        })
                                        .await;
                                }
                            }
                            Some(Err(e)) => {
                                let _ = event_tx
                                    .send(SessionEvent::Lifecycle {
                                        status: format!("error: {}", e),
                                    })
                                    .await;
                                break;
                            }
                            None => {
                                // Stream ended
                                break;
                            }
                        }
                    }
                    _ = &mut abort_rx => {
                        break;
                    }
                }
            }

            let download_ms = stream_start.elapsed().as_secs_f64() * 1000.0;
            let _ = event_tx
                .send(SessionEvent::Timing {
                    phase: "download".to_string(),
                    ms: download_ms,
                })
                .await;

            let _ = event_tx
                .send(SessionEvent::Lifecycle {
                    status: "closed".to_string(),
                })
                .await;
        });

        Ok(())
    }

    async fn send(&mut self, _data: Vec<u8>) -> Result<(), String> {
        Err("SSE sessions are server-push only — cannot send data".to_string())
    }

    async fn close(&mut self) -> Result<(), String> {
        if let Some(tx) = self.abort_tx.take() {
            let _ = tx.send(());
        }
        Ok(())
    }
}
