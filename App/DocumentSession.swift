import AppKit
import Combine
import RemarqueCore

struct OutlineEntry: Identifiable, Codable {
    var title: String
    var level: Int
    var start: Int
    var end: Int
    var kind: String
    var id: Int { start }
}

@MainActor final class DocumentSession: ObservableObject {
    let id = UUID().uuidString
    private(set) var engine: DocumentEngine
    @Published private(set) var source: String
    @Published private(set) var revision = 0
    @Published var selection = EditorSelection()
    @Published var outline: [OutlineEntry] = []
    @Published var error: String?
    @Published var activeTab = "markdown"
    @Published var showOutline = true
    @Published var showSource = true
    @Published var showPreview = true
    @Published var sourceSize: Double = 15
    @Published var previewSize: Double = 17
    @Published var wordCount = 0
    @Published var diagramCount = 0
    @Published var webReady = false
    var onChange: (() -> Void)?
    var sendWeb: (([String: Any]) -> Void)?
    var revealSource: ((NSRange) -> Void)?
    var inputGroup: (String, String, Date)?
    init(_ source: String = "") { self.source = source; engine = DocumentEngine(source) }
    var dirty: Bool { engine.isDirty }
    func load(_ text: String) { engine = DocumentEngine(text); source = text; revision = 0; selection = .init(); broadcast() }
    func select(_ range: SourceRange, surface: String, reveal: Bool = false) {
        engine.select(.init(range, surface: surface)); selection = engine.selection
        if surface == "rendered" || reveal { revealSource?(selection.range.nsRange) }
        if surface != "rendered" { sendWeb?(["type":"selection", "documentID":id, "revision":revision, "start":range.start,"end":range.end,"reveal":reveal]) }
    }
    func group(for surface: String) -> String {
        let now = Date()
        if let (name, previous, time) = inputGroup, previous == surface, now.timeIntervalSince(time) < 0.5 { inputGroup = (name, surface, now); return name }
        let name = UUID().uuidString; inputGroup = (name, surface, now); return name
    }
    func apply(_ patches: [SourcePatch], base: Int? = nil, selection next: EditorSelection? = nil, label: String = "Edit", group: String? = nil, transactionID: String? = nil) {
        do {
            try engine.apply(patches, baseRevision: base ?? revision, selection: next, label: label, group: group)
            source = engine.text; revision = engine.revision; selection = engine.selection
            onChange?(); broadcast(transactionID: transactionID, patches: patches)
        } catch { self.error = error.localizedDescription; broadcast(rejected: transactionID) }
    }
    func replaceSource(_ text: String, selection range: NSRange) {
        guard text != source else { return }
        apply([DocumentEngine.minimalPatch(from: source, to: text)], selection: .init(.init(range.location, range.location + range.length)), group: group(for: "source"))
    }
    func undo() { do { if try engine.undo() != nil { didUndo() } } catch { self.error = error.localizedDescription } }
    func redo() { do { if try engine.redo() != nil { didUndo() } } catch { self.error = error.localizedDescription } }
    private func didUndo() { inputGroup = nil; source = engine.text; revision = engine.revision; selection = engine.selection; onChange?(); broadcast(); revealSource?(selection.range.nsRange) }
    func markSaved(_ text: String) { engine.markSaved(text); objectWillChange.send() }
    func broadcast(transactionID: String? = nil, patches: [SourcePatch] = [], rejected: String? = nil) {
        let encoded = (try? JSONSerialization.jsonObject(with: JSONEncoder().encode(patches))) ?? []
        sendWeb?(["type":"state", "documentID":id, "revision":revision, "source":source,
                  "start":selection.range.start,"end":selection.range.end,"surface":selection.surface,
                  "transactionID":transactionID ?? "", "rejected":rejected ?? "", "patches":encoded])
    }
    func command(_ name: String, value: Any? = nil) {
        if name == "undo" { undo(); return }; if name == "redo" { redo(); return }
        inputGroup = nil
        var message: [String:Any] = ["type":"command","name":name,"start":selection.range.start,"end":selection.range.end,"surface":selection.surface]
        if let value { message["value"] = value }
        sendWeb?(message)
    }
}
