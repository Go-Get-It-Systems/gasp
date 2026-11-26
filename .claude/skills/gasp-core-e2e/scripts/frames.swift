import AVFoundation
import AppKit
let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1]); let out = args[2]
let step = Double(args[3]) ?? 0.5
let asset = AVURLAsset(url: url)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
gen.maximumSize = CGSize(width: 330, height: 717)
let dur = CMTimeGetSeconds(asset.duration)
print("duration", dur)
var t = 0.0; var i = 0
while t < dur {
  if let cg = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) {
    let rep = NSBitmapImageRep(cgImage: cg)
    let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.6])!
    try! data.write(to: URL(fileURLWithPath: String(format: "%@/f%03d_%05.1f.jpg", out, i, t)))
  }
  t += step; i += 1
}
