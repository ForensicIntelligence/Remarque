import Foundation
@MainActor enum Scratchpad {
    static func append(_ text:String)throws{
        let directory=LocalStorage.root;try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true)
        let url=directory.appendingPathComponent("Scratchpad.md");let old=(try? String(contentsOf:url,encoding:.utf8)) ?? "# Scratchpad\n"
        try Data((old+"\n"+text+"\n").utf8).write(to:url,options:.atomic)
    }
}
