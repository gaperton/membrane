/// Health status reported by the service.
///
/// The OpenAPI document pins `status` to the single value `ok`, so this type
/// deliberately has one case. Widening the contract adds a case here and makes
/// every exhaustive switch over it a compile error until it is handled.
public enum HealthStatus: String, Sendable, Hashable, CaseIterable {
  case ok
}

extension HealthStatus {
  /// Maps the generated payload onto the published type.
  ///
  /// The switch is intentionally exhaustive and has no `default`: regenerating
  /// from a document that adds a status fails the build here rather than
  /// silently reporting the wrong value.
  init(_ payload: Components.Schemas.HealthResponse.statusPayload) {
    switch payload {
    case .ok:
      self = .ok
    }
  }
}
