use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::{mpsc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SessionProtocol {
    Http,
    Sse,
    WebSocket,
    Grpc,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionConfig {
    pub protocol: SessionProtocol,
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind")]
pub enum SessionEvent {
    Lifecycle {
        status: String,
    },
    Data {
        #[serde(serialize_with = "serialize_bytes_as_array")]
        payload: Vec<u8>,
    },
    Timing {
        phase: String,
        ms: f64,
    },
    SseFrame {
        event_type: String,
        data: String,
        id: Option<String>,
    },
}

fn serialize_bytes_as_array<S>(bytes: &Vec<u8>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    use serde::ser::SerializeSeq;
    let mut seq = serializer.serialize_seq(Some(bytes.len()))?;
    for byte in bytes {
        seq.serialize_element(byte)?;
    }
    seq.end()
}

#[async_trait::async_trait]
pub trait SessionHandler: Send + Sync {
    async fn open(
        &mut self,
        config: SessionConfig,
        event_tx: mpsc::Sender<SessionEvent>,
    ) -> Result<(), String>;

    async fn send(&mut self, data: Vec<u8>) -> Result<(), String>;

    async fn close(&mut self) -> Result<(), String>;
}

pub struct SessionManager {
    sessions: Mutex<HashMap<String, Box<dyn SessionHandler>>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub async fn insert(&self, id: String, handler: Box<dyn SessionHandler>) {
        self.sessions.lock().await.insert(id, handler);
    }

    pub async fn remove(&self, id: &str) -> Option<Box<dyn SessionHandler>> {
        self.sessions.lock().await.remove(id)
    }

    pub async fn send_to(&self, id: &str, data: Vec<u8>) -> Result<(), String> {
        let mut sessions = self.sessions.lock().await;
        let handler = sessions
            .get_mut(id)
            .ok_or_else(|| format!("Session not found: {}", id))?;
        handler.send(data).await
    }
}
