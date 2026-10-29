import AppKit
import SwiftUI
import RemarqueCore

@MainActor @objc(RemarqueDocument) final class RemarqueDocument: NSDocument {
    let session = DocumentSession()
    override init() {
        super.init()
        session.onChange = { [weak self] in self?.updateChangeCount(.changeDone) }
        hasUndoManager = false
    }
    override class var autosavesInPlace: Bool { true }
    override var fileURL:URL? {didSet{MainActor.assumeIsolated{session.fileURL=fileURL}}}
    override var isDocumentEdited: Bool { session.dirty }
    override func data(ofType typeName: String) throws -> Data { Data(session.source.utf8) }
    nonisolated override func read(from data: Data, ofType typeName: String) throws {
        let text = try SourceBuffer(data: data).text
        MainActor.assumeIsolated { session.load(text) }
    }
    override func updateChangeCount(_ change:NSDocument.ChangeType){
        super.updateChangeCount(change)
        // Autosaving an untitled draft to macOS's recovery directory is not a
        // user save. It must remain Edited and continue prompting on close.
        if fileURL != nil && (change == .changeCleared || change == .changeAutosaved){session.markSaved(session.source)}
    }
    override func makeWindowControllers() {
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1320, height: 860), styleMask: [.titled,.closable,.miniaturizable,.resizable], backing: .buffered, defer: false)
        window.minSize = NSSize(width: 800, height: 540)
        window.title = "Remarque"
        window.tabbingMode = .preferred
        window.setFrameAutosaveName("RemarqueDocument")
        window.contentView = NSHostingView(rootView: EditorWorkspace(session: session))
        addWindowController(NSWindowController(window: window)); window.center()
    }
    override func close(){session.closed();super.close()}
}
