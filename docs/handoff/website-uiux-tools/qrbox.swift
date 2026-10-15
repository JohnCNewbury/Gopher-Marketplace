import Foundation
import CoreImage
import AppKit
// usage: qrbox <capture.png> <url> <out_qr.png>
let a = CommandLine.arguments
let img = CIImage(contentsOf: URL(fileURLWithPath: a[1]))!
let det = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])!
if let f = det.features(in: img).first as? CIQRCodeFeature {
  let h = img.extent.height, b = f.bounds
  print("BOX \(Int(b.minX)) \(Int(h - b.maxY)) \(Int(b.width)) \(Int(b.height))")   // top-left origin
}
let gen = CIFilter(name: "CIQRCodeGenerator")!
gen.setValue(a[2].data(using: .utf8), forKey: "inputMessage"); gen.setValue("M", forKey: "inputCorrectionLevel")
let qr = gen.outputImage!.transformed(by: CGAffineTransform(scaleX: 20, y: 20))
let rep = NSCIImageRep(ciImage: qr); let ns = NSImage(size: rep.size); ns.addRepresentation(rep)
let bmp = NSBitmapImageRep(data: ns.tiffRepresentation!)!
try! bmp.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[3]))
print("QR written")
