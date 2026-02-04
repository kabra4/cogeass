use super::session::{SessionConfig, SessionEvent, SessionHandler};
use std::io::Read;
use tokio::sync::mpsc;

pub struct HttpHandler {
    client: Option<reqwest::Client>,
}

impl HttpHandler {
    pub fn new() -> Self {
        Self { client: None }
    }
}

#[async_trait::async_trait]
impl SessionHandler for HttpHandler {
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
            "PUT" => client.put(&config.url),
            "DELETE" => client.delete(&config.url),
            "PATCH" => client.patch(&config.url),
            "HEAD" => client.head(&config.url),
            _ => return Err(format!("Unsupported HTTP method: {}", method)),
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

        // Download body bytes
        let t2 = std::time::Instant::now();
        let status = response.status().as_u16();
        let status_text = response
            .status()
            .canonical_reason()
            .unwrap_or("")
            .to_string();

        let mut response_headers = std::collections::HashMap::new();
        for (key, value) in response.headers().iter() {
            let value_str = String::from_utf8_lossy(value.as_bytes()).to_string();
            response_headers.insert(key.as_str().to_string(), value_str);
        }

        let content_encoding = response_headers.get("content-encoding").cloned();
        let body_bytes = response.bytes().await.map_err(|e| e.to_string())?;
        let download_ms = t2.elapsed().as_secs_f64() * 1000.0;
        let _ = event_tx
            .send(SessionEvent::Timing {
                phase: "download".to_string(),
                ms: download_ms,
            })
            .await;

        let wire_size_bytes = body_bytes.len();

        // Decompress if necessary
        let t3 = std::time::Instant::now();
        let body_text = if let Some(encoding) = content_encoding {
            let decompressed_bytes = match encoding.to_lowercase().as_str() {
                "gzip" => {
                    let mut decoder = flate2::read::GzDecoder::new(&body_bytes[..]);
                    let mut decompressed = Vec::new();
                    decoder
                        .read_to_end(&mut decompressed)
                        .map_err(|e| e.to_string())?;
                    decompressed
                }
                "deflate" => {
                    let mut decoder = flate2::read::DeflateDecoder::new(&body_bytes[..]);
                    let mut decompressed = Vec::new();
                    decoder
                        .read_to_end(&mut decompressed)
                        .map_err(|e| e.to_string())?;
                    decompressed
                }
                "br" => {
                    let mut decoder = brotli::Decompressor::new(&body_bytes[..], 4096);
                    let mut decompressed = Vec::new();
                    decoder
                        .read_to_end(&mut decompressed)
                        .map_err(|e| e.to_string())?;
                    decompressed
                }
                _ => body_bytes.to_vec(),
            };
            String::from_utf8_lossy(&decompressed_bytes).to_string()
        } else {
            String::from_utf8_lossy(&body_bytes).to_string()
        };
        let process_ms = t3.elapsed().as_secs_f64() * 1000.0;
        let _ = event_tx
            .send(SessionEvent::Timing {
                phase: "process".to_string(),
                ms: process_ms,
            })
            .await;

        let total_ms = t0.elapsed().as_secs_f64() * 1000.0;
        let _ = event_tx
            .send(SessionEvent::Timing {
                phase: "total".to_string(),
                ms: total_ms,
            })
            .await;

        // Build response metadata as JSON and send as Data event
        let response_meta = serde_json::json!({
            "status": status,
            "statusText": status_text,
            "headers": response_headers,
            "bodyText": body_text,
            "wireSizeBytes": wire_size_bytes,
            "bodySizeBytes": body_text.len(),
        });

        let _ = event_tx
            .send(SessionEvent::Data {
                payload: response_meta.to_string().into_bytes(),
            })
            .await;

        let _ = event_tx
            .send(SessionEvent::Lifecycle {
                status: "closed".to_string(),
            })
            .await;

        self.client = Some(client);
        Ok(())
    }

    async fn send(&mut self, _data: Vec<u8>) -> Result<(), String> {
        Err("HTTP sessions are request/response — use open() to send a request".to_string())
    }

    async fn close(&mut self) -> Result<(), String> {
        self.client = None;
        Ok(())
    }
}
