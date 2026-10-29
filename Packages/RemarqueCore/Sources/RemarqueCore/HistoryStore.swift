import Foundation

public struct HistorySnapshot:Codable,Identifiable,Sendable {
    public var id:String
    public var date:Date
    public var bytes:Int
    public var manual:Bool
    public var digest:String
    public var label:String
}
public struct RecoveryEntry:Codable,Identifiable,Sendable {
    public var id:String
    public var date:Date
    public var filePath:String?
    public var source:String
    public var selection:SourceRange
    public init(id:String,date:Date=Date(),filePath:String?,source:String,selection:SourceRange){self.id=id;self.date=date;self.filePath=filePath;self.source=source;self.selection=selection}
}
public actor HistoryStore {
    private let root:URL
    private let fm=FileManager.default
    public init(root:URL){self.root=root}
    private func folder(_ key:String)->URL{root.appendingPathComponent("Versions").appendingPathComponent(DocumentEngine.digest(key))}
    public func list(key:String)throws->[HistorySnapshot]{
        let url=folder(key).appendingPathComponent("index.json");guard fm.fileExists(atPath:url.path) else{return []}
        return try JSONDecoder().decode([HistorySnapshot].self,from:Data(contentsOf:url)).sorted{$0.date>$1.date}
    }
    public func capture(key:String,text:String,manual:Bool=false,label:String="Automatic")throws{
        var entries=try list(key:key);let digest=DocumentEngine.digest(text)
        if !manual,entries.first?.digest==digest{return}
        let directory=folder(key);try fm.createDirectory(at:directory,withIntermediateDirectories:true)
        let entry=HistorySnapshot(id:UUID().uuidString,date:Date(),bytes:text.utf8.count,manual:manual,digest:digest,label:label)
        try Data(text.utf8).write(to:directory.appendingPathComponent(entry.id+".md"),options:.atomic)
        entries.insert(entry,at:0)
        var autoCount=0,total=0;var keep:[HistorySnapshot]=[],remove:[HistorySnapshot]=[]
        for e in entries{
            if !e.manual{autoCount+=1;total+=e.bytes}
            if !e.manual && (autoCount>200 || total>100*1024*1024){remove.append(e)}else{keep.append(e)}
        }
        try JSONEncoder().encode(keep).write(to:directory.appendingPathComponent("index.json"),options:.atomic)
        for e in remove{try? fm.removeItem(at:directory.appendingPathComponent(e.id+".md"))}
    }
    public func text(key:String,id:String)throws->String{
        guard try list(key:key).contains(where:{$0.id==id}) else{throw CocoaError(.fileReadNoSuchFile)}
        return try SourceBuffer(data:Data(contentsOf:folder(key).appendingPathComponent(id+".md"))).text
    }
    public func journal(_ entry:RecoveryEntry)throws{
        let directory=root.appendingPathComponent("Recovery");try fm.createDirectory(at:directory,withIntermediateDirectories:true)
        try JSONEncoder().encode(entry).write(to:directory.appendingPathComponent(entry.id+".json"),options:.atomic)
    }
    public func recoveries()throws->[RecoveryEntry]{
        let directory=root.appendingPathComponent("Recovery");guard fm.fileExists(atPath:directory.path) else{return []}
        return try fm.contentsOfDirectory(at:directory,includingPropertiesForKeys:nil).filter{$0.pathExtension=="json"}.compactMap{try? JSONDecoder().decode(RecoveryEntry.self,from:Data(contentsOf:$0))}.sorted{$0.date>$1.date}
    }
    public func removeRecovery(_ id:String)throws{
        guard UUID(uuidString:id) != nil else{return};let file=root.appendingPathComponent("Recovery").appendingPathComponent(id+".json")
        if fm.fileExists(atPath:file.path){try fm.removeItem(at:file)}
    }
}
