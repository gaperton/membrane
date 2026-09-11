/// A failure raised by ``MembraneClient``.
///
/// The generated transport reports every failure as an `OpenAPIRuntime`
/// `ClientError` whose description embeds the full request, input, and
/// response. That is useful when debugging the generator, but it is not a
/// reasonable thing to show a caller, so the client narrows it to these cases
/// and carries the underlying error's description in `message`.
public enum MembraneClientError: Error, Sendable, Equatable {
  /// The request never reached the service, or no response came back.
  case transportFailure(message: String)

  /// The service responded in a way the documented contract does not allow:
  /// an undocumented status code, a body that is not the documented media
  /// type, or a payload that does not match the schema.
  case unexpectedResponse(message: String)
}

extension MembraneClientError: CustomStringConvertible {
  public var description: String {
    switch self {
    case .transportFailure(let message):
      return "could not reach the service: \(message)"
    case .unexpectedResponse(let message):
      return "unexpected response from the service: \(message)"
    }
  }
}
