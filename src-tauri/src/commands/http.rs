use futures::StreamExt;
use serde::Serialize;
use std::collections::HashMap;
use tauri::Emitter;
use uuid::Uuid;

#[derive(Serialize)]
pub struct ResponseTimings {
    pub prepare_ms: f64,
    pub dns_lookup_ms: f64,
    pub tcp_connect_ms: f64,
    pub tls_handshake_ms: f64,
    pub ttfb_ms: f64,
    pub download_ms: f64,
    pub process_ms: f64,
    pub total_ms: f64,
}

#[derive(Serialize)]
pub struct BackendResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body_text: String,
    pub timings: ResponseTimings,
    pub wire_size_bytes: usize,
    pub body_size_bytes: usize,
    pub session_id: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct SseEvent {
    pub session_id: String,
    pub event_id: u32,
    pub event_type: String,
    pub data: String,
    pub timestamp: u64,
    pub elapsed_ms: f64,
}

fn parse_sse_frame(frame: &str) -> (String, String) {
    let mut event_type = String::from("message");
    let mut data_lines: Vec<&str> = Vec::new();

    for line in frame.lines() {
        if let Some(value) = line.strip_prefix("event:") {
            event_type = value.trim().to_string();
        } else if let Some(value) = line.strip_prefix("data:") {
            data_lines.push(value.strip_prefix(' ').unwrap_or(value));
        } else if line.starts_with("id:") {
            // SSE id field — ignored for now
        } else if line.starts_with("retry:") {
            // SSE retry field — ignored
        }
    }

    let data = data_lines.join("\n");
    (event_type, data)
}

async fn handle_sse_stream(
    app: tauri::AppHandle,
    session_id: String,
    response: reqwest::Response,
    start_time: std::time::Instant,
    prepare_ms: f64,
    ttfb_ms: f64,
) -> Result<BackendResponse, String> {
    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("")
        .to_string();

    let mut response_headers = HashMap::new();
    for (key, value) in response.headers().iter() {
        let value_str = String::from_utf8_lossy(value.as_bytes()).to_string();
        response_headers.insert(key.as_str().to_string(), value_str);
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut accumulated_body = String::new();
    let mut event_id: u32 = 0;
    let mut wire_size_bytes: usize = 0;

    let stream_start = std::time::Instant::now();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| e.to_string())?;
        wire_size_bytes += chunk.len();
        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        // Process complete SSE frames (delimited by \n\n)
        while let Some(pos) = buffer.find("\n\n") {
            let frame = buffer[..pos].to_string();
            buffer = buffer[pos + 2..].to_string();

            // Skip empty frames
            if frame.trim().is_empty() {
                continue;
            }

            let (event_type, data) = parse_sse_frame(&frame);

            // Skip frames with no data
            if data.is_empty() {
                continue;
            }

            event_id += 1;
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;
            let elapsed = stream_start.elapsed().as_secs_f64() * 1000.0;

            let sse_event = SseEvent {
                session_id: session_id.clone(),
                event_id,
                event_type,
                data: data.clone(),
                timestamp: now,
                elapsed_ms: elapsed,
            };

            let _ = app.emit("sse_event", &sse_event);

            accumulated_body.push_str(&data);
            accumulated_body.push('\n');
        }
    }

    let download_ms = stream_start.elapsed().as_secs_f64() * 1000.0;
    let total_ms = start_time.elapsed().as_secs_f64() * 1000.0;
    let body_size_bytes = accumulated_body.len();

    let timings = ResponseTimings {
        prepare_ms,
        dns_lookup_ms: 0.0,
        tcp_connect_ms: 0.0,
        tls_handshake_ms: 0.0,
        ttfb_ms,
        download_ms,
        process_ms: 0.0,
        total_ms,
    };

    Ok(BackendResponse {
        status,
        status_text,
        headers: response_headers,
        body_text: accumulated_body,
        timings,
        wire_size_bytes,
        body_size_bytes,
        session_id: Some(session_id),
    })
}

#[tauri::command]
pub async fn load_spec_from_url(url: String) -> Result<String, String> {
    reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn make_request(
    app: tauri::AppHandle,
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
    session_id: Option<String>,
) -> Result<BackendResponse, String> {
    let t0 = std::time::Instant::now();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()
        .map_err(|e| e.to_string())?;

    let method = method.to_uppercase();

    // Build the request based on the method
    let mut request_builder = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        "HEAD" => client.head(&url),
        _ => return Err(format!("Unsupported HTTP method: {}", method)),
    };

    // Add all headers to the request including Accept-Encoding
    for (key, value) in headers {
        request_builder = request_builder.header(&key, value);
    }

    // Add a body if one was provided
    if let Some(body_content) = body {
        request_builder = request_builder.body(body_content);
    }

    let prepare_ms = t0.elapsed().as_secs_f64() * 1000.0;

    // Send the request and await the response (TTFB includes DNS+TCP+TLS+server)
    let t1 = std::time::Instant::now();
    let response = request_builder.send().await.map_err(|e| e.to_string())?;
    let ttfb_ms = t1.elapsed().as_secs_f64() * 1000.0;

    // Check if this is an SSE stream
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase();

    if content_type.contains("text/event-stream") {
        let sid = session_id.unwrap_or_else(|| Uuid::new_v4().to_string());
        return handle_sse_stream(app, sid, response, t0, prepare_ms, ttfb_ms).await;
    }

    // Extract status code and text
    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("")
        .to_string();

    // Extract headers from the response
    let mut response_headers = HashMap::new();
    for (key, value) in response.headers().iter() {
        let value_str = String::from_utf8_lossy(value.as_bytes()).to_string();
        response_headers.insert(key.as_str().to_string(), value_str);
    }

    // Download body bytes
    let t2 = std::time::Instant::now();
    let body_bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let download_ms = t2.elapsed().as_secs_f64() * 1000.0;

    // Wire size = raw bytes received (before decompression)
    let wire_size_bytes = body_bytes.len();

    // Check if the response is compressed by looking at the headers we captured
    let content_encoding = response_headers.get("content-encoding");

    // Decompress if necessary, measuring process time
    let t3 = std::time::Instant::now();
    let body_text = if let Some(encoding) = content_encoding {
        let decompressed_bytes = match encoding.to_lowercase().as_str() {
            "gzip" => {
                use std::io::Read;
                let mut decoder = flate2::read::GzDecoder::new(&body_bytes[..]);
                let mut decompressed = Vec::new();
                decoder
                    .read_to_end(&mut decompressed)
                    .map_err(|e| e.to_string())?;
                decompressed
            }
            "deflate" => {
                use std::io::Read;
                let mut decoder = flate2::read::DeflateDecoder::new(&body_bytes[..]);
                let mut decompressed = Vec::new();
                decoder
                    .read_to_end(&mut decompressed)
                    .map_err(|e| e.to_string())?;
                decompressed
            }
            "br" => {
                use std::io::Read;
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
        // No compression, use original bytes
        String::from_utf8_lossy(&body_bytes).to_string()
    };
    let process_ms = t3.elapsed().as_secs_f64() * 1000.0;

    let body_size_bytes = body_text.len();
    let total_ms = t0.elapsed().as_secs_f64() * 1000.0;

    let timings = ResponseTimings {
        prepare_ms,
        dns_lookup_ms: 0.0,
        tcp_connect_ms: 0.0,
        tls_handshake_ms: 0.0,
        ttfb_ms,
        download_ms,
        process_ms,
        total_ms,
    };

    // Construct and return the response object for the frontend
    Ok(BackendResponse {
        status,
        status_text,
        headers: response_headers,
        body_text,
        timings,
        wire_size_bytes,
        body_size_bytes,
        session_id: None,
    })
}
