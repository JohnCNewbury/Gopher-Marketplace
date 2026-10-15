import Foundation
import CoreImage
for path in CommandLine.arguments.dropFirst() {
  guard let img = CIImage(contentsOf: URL(fileURLWithPath: path)) else { print("\(path): cannot load"); continue }
  let det = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])!
  let fs = det.features(in: img).compactMap { ($0 as? CIQRCodeFeature)?.messageString }
  print("\((path as NSString).lastPathComponent): \(fs.isEmpty ? "(no QR found)" : fs.joined(separator: " | "))")
}
