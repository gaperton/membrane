import Foundation
import MembraneClient

/// Exercises `MembraneClient` against a running service.
///
/// ```
/// membrane-cli [--url http://localhost:3000]
/// ```
@main
struct MembraneCLI {
  private static let defaultURL = "http://localhost:3000"

  static func main() async {
    let arguments = Array(CommandLine.arguments.dropFirst())

    if arguments.contains("--help") || arguments.contains("-h") {
      print("usage: membrane-cli [--url <base-url>]")
      print("       reads GET /health and prints the reported status")
      return
    }

    guard let serverURL = parseURL(arguments) else {
      FileHandle.standardError.write(
        Data("membrane-cli: --url requires a valid absolute URL\n".utf8)
      )
      exit(2)
    }

    do {
      let client = MembraneClient(serverURL: serverURL)
      let status = try await client.health()

      print(status.rawValue)
    } catch {
      FileHandle.standardError.write(
        Data("membrane-cli: \(error)\n".utf8)
      )
      exit(1)
    }
  }

  private static func parseURL(_ arguments: [String]) -> URL? {
    guard let flag = arguments.firstIndex(of: "--url") else {
      return URL(string: defaultURL)
    }

    let value = arguments.index(after: flag)

    guard value < arguments.endIndex else {
      return nil
    }

    guard let url = URL(string: arguments[value]), url.scheme != nil else {
      return nil
    }

    return url
  }
}
