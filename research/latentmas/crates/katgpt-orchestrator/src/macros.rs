//! Macros used by python_bridge.

/// Generate builder field setter methods.
/// Usage: `builder_field!(field_name, FieldType);`
/// Setter accepts `impl Into<FieldType>`, so it works with `&str`, `String`, etc.
macro_rules! builder_field {
    ($name:ident, $field_type:ty) => {
        pub fn $name(mut self, value: impl Into<$field_type>) -> Self {
            self.$name = value.into();
            self
        }
    };
}
