import ExpoModulesCore
import UIKit
import Vision

/// Lines closer together than this (as a fraction of image height) are treated
/// as sitting on the same row when sorting into reading order.
private let sameRowTolerance = 0.01

internal final class ImageLoadException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Could not read an image from \(param)"
  }
}

/// A recognized line in normalized top-left coordinates.
private struct RecognizedLine {
  let text: String
  let confidence: Double
  let x: Double
  let y: Double
  let width: Double
  let height: Double

  var dictionary: [String: Any] {
    ["text": text, "confidence": confidence, "x": x, "y": y, "width": width, "height": height]
  }
}

public class ReceiptOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReceiptOcr")

    AsyncFunction("recognizeText") { (uri: URL) -> [String: Any] in
      guard let image = Self.loadImage(from: uri), let cgImage = image.cgImage else {
        throw ImageLoadException(uri.absoluteString)
      }

      let request = VNRecognizeTextRequest()
      // `.accurate` is slower than `.fast` but reads small print, which is
      // most of what matters on a receipt.
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true

      // A photo carries its rotation in EXIF rather than in the pixel buffer,
      // so Vision has to be told, or sideways captures come back as noise.
      let handler = VNImageRequestHandler(
        cgImage: cgImage,
        orientation: Self.cgOrientation(from: image.imageOrientation),
        options: [:]
      )
      try handler.perform([request])

      var lines: [RecognizedLine] = []
      for observation in request.results ?? [] {
        guard let candidate = observation.topCandidates(1).first else { continue }
        let box = observation.boundingBox
        lines.append(
          RecognizedLine(
            text: candidate.string,
            confidence: Double(candidate.confidence),
            x: Double(box.origin.x),
            // Vision's origin is the bottom left; JS expects the top left.
            y: Double(1 - box.origin.y - box.height),
            width: Double(box.width),
            height: Double(box.height)
          )
        )
      }

      // Vision returns observations in no particular order.
      lines.sort { first, second in
        if abs(first.y - second.y) > sameRowTolerance {
          return first.y < second.y
        }
        return first.x < second.x
      }

      return [
        "text": lines.map(\.text).joined(separator: "\n"),
        "lines": lines.map(\.dictionary),
        "width": Int(image.size.width),
        "height": Int(image.size.height),
      ]
    }
  }

  private static func loadImage(from url: URL) -> UIImage? {
    if let data = try? Data(contentsOf: url), let image = UIImage(data: data) {
      return image
    }
    return UIImage(contentsOfFile: url.path)
  }

  private static func cgOrientation(from orientation: UIImage.Orientation)
    -> CGImagePropertyOrientation
  {
    switch orientation {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }
}
