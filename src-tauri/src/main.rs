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

    // Add headers to the request
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

    // Extract the response body as bytes (already decompressed by reqwest)
    // reqwest will automatically decode gzip/deflate/brotli with the enabled features
    let body_bytes = response.bytes().await.map_err(|e| e.to_string())?;

    // Calculate response size in bytes (decompressed size)
    let response_size_bytes = body_bytes.len();

    // Convert bytes to text
    let body_text = String::from_utf8_lossy(&body_bytes).to_string();

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
    let context = tauri::generate_context!();
    tauri::Builder::default()
        .menu(tauri::Menu::os_default(&context.package_info().name))
        .invoke_handler(tauri::generate_handler![
            load_spec_from_url,
            make_request // Register the new command
        ])
        .run(context)
        .expect("error while running tauri application");
}
