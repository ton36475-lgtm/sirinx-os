//! GHOSTCLAW Thaimart Adapter — e-commerce platform integration.
//!
//! Connects to Thaimart (Thai e-commerce) for product sync, order tracking,
//! and inventory management. Uses the GHOSTCLAW provider chain for AI tasks.

use async_trait::async_trait;
use ghostclaw_core::{Evidence, Task, RiskTier};
use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::info;

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub price: f64,
    pub stock: u32,
    pub category: String,
    pub sku: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub customer_name: String,
    pub items: Vec<OrderItem>,
    pub total: f64,
    pub status: OrderStatus,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrderItem {
    pub product_id: String,
    pub quantity: u32,
    pub price: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum OrderStatus {
    Pending,
    Paid,
    Shipped,
    Delivered,
    Cancelled,
}

#[derive(Debug, Error)]
pub enum ThaimartError {
    #[error("thaimart API error: {0}")]
    Api(String),
    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("not configured: {0}")]
    NotConfigured(String),
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

pub struct ThaimartAdapter {
    base_url: String,
    api_key_env: String,
    http: reqwest::Client,
}

impl ThaimartAdapter {
    pub fn new(base_url: impl Into<String>, api_key_env: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            api_key_env: api_key_env.into(),
            http: reqwest::Client::new(),
        }
    }

    /// Default Thaimart adapter (reads from env).
    pub fn from_env() -> Self {
        Self::new(
            std::env::var("THAIMART_API_URL")
                .unwrap_or_else(|_| "https://api.thaimart.co/v1".into()),
            "THAIMART_API_KEY",
        )
    }

    fn api_key(&self) -> Result<String, ThaimartError> {
        std::env::var(&self.api_key_env)
            .map_err(|_| ThaimartError::NotConfigured(self.api_key_env.clone()))
    }

    /// List products with optional category filter.
    pub async fn list_products(&self, category: Option<&str>) -> Result<Vec<Product>, ThaimartError> {
        let key = self.api_key()?;
        let mut url = format!("{}/products", self.base_url);
        if let Some(cat) = category {
            url.push_str(&format!("?category={cat}"));
        }

        let resp = self.http
            .get(&url)
            .bearer_auth(key)
            .send()
            .await?
            .error_for_status()?;

        let products: Vec<Product> = resp.json().await?;
        info!(count = products.len(), "thaimart products fetched");
        Ok(products)
    }

    /// Get a single product by ID.
    pub async fn get_product(&self, id: &str) -> Result<Product, ThaimartError> {
        let key = self.api_key()?;
        let resp = self.http
            .get(format!("{}/products/{id}", self.base_url))
            .bearer_auth(key)
            .send()
            .await?
            .error_for_status()?;

        Ok(resp.json().await?)
    }

    /// Update product stock — Yellow risk (mutates external state).
    pub async fn update_stock(&self, product_id: &str, new_stock: u32) -> Result<Product, ThaimartError> {
        let key = self.api_key()?;
        let resp = self.http
            .patch(format!("{}/products/{product_id}/stock", self.base_url))
            .bearer_auth(key)
            .json(&serde_json::json!({"stock": new_stock}))
            .send()
            .await?
            .error_for_status()?;

        let product: Product = resp.json().await?;
        info!(product_id, stock = new_stock, "thaimart stock updated");
        Ok(product)
    }

    /// List recent orders.
    pub async fn list_orders(&self, limit: u32) -> Result<Vec<Order>, ThaimartError> {
        let key = self.api_key()?;
        let resp = self.http
            .get(format!("{}/orders?limit={limit}", self.base_url))
            .bearer_auth(key)
            .send()
            .await?
            .error_for_status()?;

        Ok(resp.json().await?)
    }

    /// Update order status — Red risk (customer-facing mutation).
    pub async fn update_order_status(
        &self,
        order_id: &str,
        status: OrderStatus,
    ) -> Result<Order, ThaimartError> {
        let key = self.api_key()?;
        let status_str = match status {
            OrderStatus::Pending => "pending",
            OrderStatus::Paid => "paid",
            OrderStatus::Shipped => "shipped",
            OrderStatus::Delivered => "delivered",
            OrderStatus::Cancelled => "cancelled",
        };

        let resp = self.http
            .patch(format!("{}/orders/{order_id}/status", self.base_url))
            .bearer_auth(key)
            .json(&serde_json::json!({"status": status_str}))
            .send()
            .await?
            .error_for_status()?;

        let order: Order = resp.json().await?;
        info!(order_id, status = status_str, "thaimart order status updated");
        Ok(order)
    }

    /// Classify the risk tier for a Thaimart operation.
    pub fn classify_operation(operation: &str) -> RiskTier {
        let op = operation.to_lowercase();
        if op.contains("cancel") || op.contains("delete") || op.contains("refund")
            || op.contains("status") || op.contains("ship")
        {
            RiskTier::Red
        } else if op.contains("update") || op.contains("stock") || op.contains("edit") {
            RiskTier::Yellow
        } else {
            RiskTier::Green
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classify_read_operations_are_green() {
        assert_eq!(ThaimartAdapter::classify_operation("list_products"), RiskTier::Green);
        assert_eq!(ThaimartAdapter::classify_operation("get_product"), RiskTier::Green);
        assert_eq!(ThaimartAdapter::classify_operation("list_orders"), RiskTier::Green);
    }

    #[test]
    fn classify_mutations_are_yellow() {
        assert_eq!(ThaimartAdapter::classify_operation("update_stock"), RiskTier::Yellow);
        assert_eq!(ThaimartAdapter::classify_operation("edit_product"), RiskTier::Yellow);
    }

    #[test]
    fn classify_customer_facing_are_red() {
        assert_eq!(ThaimartAdapter::classify_operation("cancel_order"), RiskTier::Red);
        assert_eq!(ThaimartAdapter::classify_operation("ship_order"), RiskTier::Red);
        assert_eq!(ThaimartAdapter::classify_operation("refund"), RiskTier::Red);
    }
}
