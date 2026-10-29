import AppIntents

struct NewMarkdownNoteIntent:AppIntent {
    static let title:LocalizedStringResource="New Markdown Note"
    static let description=IntentDescription("Create a local Markdown document in Remarque.")
    static let openAppWhenRun=true
    @Parameter(title:"Initial text",default:"") var text:String
    func perform()async throws->some IntentResult{
        await MainActor.run{AppWindows.shared.newDocument(text:text)}
        return .result()
    }
}
struct AppendToScratchpadIntent:AppIntent {
    static let title:LocalizedStringResource="Append to Scratchpad"
    static let description=IntentDescription("Append text to Remarque’s local Scratchpad.md file.")
    @Parameter(title:"Text") var text:String
    func perform()async throws->some IntentResult{
        try await MainActor.run{try Scratchpad.append(text)}
        return .result()
    }
}
struct RemarqueShortcuts:AppShortcutsProvider {
    static var appShortcuts:[AppShortcut]{
        AppShortcut(intent:NewMarkdownNoteIntent(),phrases:["New note in \(.applicationName)"],shortTitle:"New Markdown Note",systemImageName:"doc.badge.plus")
        AppShortcut(intent:AppendToScratchpadIntent(),phrases:["Append to my \(.applicationName) scratchpad"],shortTitle:"Append to Scratchpad",systemImageName:"text.badge.plus")
    }
}
