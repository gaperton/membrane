import Foundation
import OpenAPIRuntime
import OpenAPIURLSession

/// A client for the Membrane REST API.
///
/// The request and response types are generated from the service's OpenAPI
/// document by `swift-openapi-generator` and stay internal to this module.
/// This type is the published surface, so regenerating from a changed document
/// cannot alter the package's API without a deliberate edit here.
///
/// ```swift
/// let client = MembraneClient(serverURL: URL(string: "http://localhost:3000")!)
/// let status = try await client.health()
/// ```
public struct MembraneClient: Sendable {
  private let generated: Client

  /// Creates a client that talks to the service at `serverURL`.
  ///
  /// - Parameters:
  ///   - serverURL: Base URL of the service, such as
  ///     `http://localhost:3000`. The OpenAPI document declares no servers, so
  ///     the caller always supplies this.
  ///   - transport: Transport used to perform requests. Defaults to
  ///     `URLSessionTransport`; tests can substitute their own.
  public init(
    serverURL: URL,
    transport: any ClientTransport = URLSessionTransport()
  ) {
    generated = Client(serverURL: serverURL, transport: transport)
  }

  /// Reads `GET /health`.
  ///
  /// - Returns: The reported health status.
  /// - Throws: ``MembraneClientError``. The typed `throws` clause keeps the
  ///   failure contract part of the signature, so callers can switch over it
  ///   exhaustively.
  public func health() async throws(MembraneClientError) -> HealthStatus {
    do {
      let output = try await generated.get_sol_health(.init())

      return HealthStatus(try output.ok.body.json.status)
    } catch let error as ClientError {
      // A `ClientError` without a response never made it past the transport;
      // one with a response failed while interpreting what came back.
      let message = error.underlyingError.localizedDescription

      throw error.response == nil
        ? MembraneClientError.transportFailure(message: message)
        : MembraneClientError.unexpectedResponse(message: message)
    } catch {
      throw MembraneClientError.unexpectedResponse(
        message: error.localizedDescription
      )
    }
  }
}
