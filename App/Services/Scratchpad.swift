import Foundation
@MainActor enum Scratchpad {
    static func append(_ text:String)throws{
        let directory=LocalStorage.root;try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true)
        let url=directory.appendingPathComponent("Scratchpad.md")
        var coordinationError:NSError?,writeError:Error?
        NSFileCoordinator().coordinate(writingItemAt:url,options:.forMerging,error:&coordinationError){coordinated in
            do{
                let old=FileManager.default.fileExists(atPath:coordinated.path) ? try String(contentsOf:coordinated,encoding:.utf8):"# Scratchpad\n"
                try Data((old+"\n"+text+"\n").utf8).write(to:coordinated,options:.atomic)
            }catch{writeError=error}
        }
        if let error=coordinationError ?? writeError as NSError?{throw error}
    }
}
