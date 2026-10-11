import AVFoundation
import AppKit
import CoreVideo
let finalOut = URL(fileURLWithPath: CommandLine.arguments[1])
let out = finalOut.deletingLastPathComponent().appendingPathComponent("video-only.mp4")
let audioURL = URL(fileURLWithPath: CommandLine.arguments[2])
let audio = AVURLAsset(url: audioURL)
let dur = CMTimeGetSeconds(audio.duration) + 0.5
try? FileManager.default.removeItem(at: out)
let w = 720, h = 1280, fps: Int32 = 30
let writer = try! AVAssetWriter(outputURL: out, fileType: .mp4)
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: w, AVVideoHeightKey: h])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vIn, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: w, kCVPixelBufferHeightKey as String: h])
writer.add(vIn)
writer.startWriting(); writer.startSession(atSourceTime: .zero)
let frames = Int(dur * Double(fps))
for i in 0..<frames {
  while !vIn.isReadyForMoreMediaData { usleep(1000) }
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  CVPixelBufferLockBaseAddress(pb!, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: w, height: h, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  let t = Double(i) / Double(fps)
  ctx.setFillColor(CGColor(red: 0.1, green: 0.5 + 0.4 * sin(t), blue: 0.6, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
  let ns = NSGraphicsContext(cgContext: ctx, flipped: false); NSGraphicsContext.current = ns
  let s = NSAttributedString(string: String(format: "AUDIO %.1fs", t), attributes: [.font: NSFont.boldSystemFont(ofSize: 90), .foregroundColor: NSColor.white])
  s.draw(at: NSPoint(x: 90, y: h/2))
  CVPixelBufferUnlockBaseAddress(pb!, [])
  adaptor.append(pb!, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps))
}
vIn.markAsFinished()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }; sem.wait()
print("status", writer.status.rawValue, writer.error as Any)

let comp = AVMutableComposition()
let vAsset = AVURLAsset(url: out)
let vt = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
try! vt.insertTimeRange(CMTimeRange(start: .zero, duration: vAsset.duration), of: vAsset.tracks(withMediaType: .video)[0], at: .zero)
let at = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
try! at.insertTimeRange(CMTimeRange(start: .zero, duration: audio.duration), of: audio.tracks(withMediaType: .audio)[0], at: .zero)
try? FileManager.default.removeItem(at: finalOut)
let ex = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetHighestQuality)!
ex.outputURL = finalOut; ex.outputFileType = .mp4
let sem2 = DispatchSemaphore(value: 0)
ex.exportAsynchronously { sem2.signal() }; sem2.wait()
print("export", ex.status.rawValue, ex.error as Any)
