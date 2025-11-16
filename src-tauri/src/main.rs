#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::Serialize;
use std::collections::HashMap;

// This struct will be serialized and returned to the frontend.
#[derive(Serialize)]
struct BackendResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body_text: String,
    response_time_ms: u64,
    response_size_bytes: usize,
}

#[tauri::command]
async fn load_spec_from_url(url: String) -> Result<String, String> {
    reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn make_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<BackendResponse, String> {
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

    // Start timing the request
    let start_time = std::time::Instant::now();

    // Send the request and await the response
    let response = request_builder.send().await.map_err(|e| e.to_string())?;

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

    // Calculate response time in milliseconds
    let response_time_ms = start_time.elapsed().as_millis() as u64;

    // Get the raw response body bytes (compressed if Content-Encoding is present)
    let body_bytes = response.bytes().await.map_err(|e| e.to_string())?;

    // Track the compressed size (what was actually transmitted over the network)
    let response_size_bytes = body_bytes.len();

    // Check if the response is compressed by looking at the headers we captured
    let content_encoding = response_headers.get("content-encoding");

    // Decompress if necessary
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

    // Construct and return the response object for the frontend
    Ok(BackendResponse {
        status,
        status_text,
        headers: response_headers,
        body_text,
        response_time_ms,
        response_size_bytes,
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            load_spec_from_url,
            make_request // Register the new command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
