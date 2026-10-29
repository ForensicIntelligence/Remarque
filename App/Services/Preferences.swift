import AppKit
import SwiftUI

struct Snippet:Codable,Identifiable,Equatable {
    var id=UUID();var name:String;var trigger:String;var body:String
    static let builtins:[Snippet]=[
        .init(name:"Note",trigger:"note",body:"> [!NOTE]\n> $0"),.init(name:"Warning",trigger:"warn",body:"> [!WARNING]\n> $0"),
        .init(name:"Fenced code",trigger:"code",body:"```\n$0\n```"),.init(name:"Table",trigger:"table",body:"| $0 | Header |\n| --- | --- |\n| Cell | Cell |"),
        .init(name:"Link",trigger:"link",body:"[$0](https://)"),.init(name:"Details",trigger:"details",body:"<details>\n<summary>$0</summary>\n\n\n</details>"),.init(name:"Front matter",trigger:"fm",body:"---\ntitle: $0\ndate: \n---")]
}
struct PreferenceValues:Codable {
    var theme="System",editorFont="SF Mono",editorSize=15.0,previewSize=17.0,lineSpacing=1.45
    var lineNumbers=false,currentLine=true,highlightCode=true,statusBar=true
    var smartEditing=true,smartHeadings=true,smartQuotes=false,smartDashes=false,pairBrackets=true,smartPaste=true
    var liveEditing=false,softWrap=true,typewriter=false,spellcheck=true,dimInactive=true,toolPalette=true,formatRibbon=true
    var livePreview=true,debounce=0.15,scrollSync=true,hideFrontMatter=true,externalLinks=true
    var mermaidEnabled=true,mermaidLive=true,mermaidFollowsTheme=true,mermaidSource=false,mermaidOutline=true,visualEditing=true,resizeDiagrams=true
    var diagramWidth=720.0,diagramHeight=420.0,diagramAlignment="Center"
    var exportFormat="HTML",imageStorage="Linked",titlePage=false,toc=false,pageNumbers=false,landscape=false,includeFrontMatter=false,embedImages=false,inlineCSS=true,htmlMermaidSource=false,docxMermaidSource=false,pageSize="Letter"
    var customCSS="",customCSSBookmark=""
    var snippets=Snippet.builtins
}
@MainActor final class Preferences:ObservableObject {
    static let shared=Preferences()
    @Published var values:PreferenceValues {didSet{save()}}
    private init(){if let data=UserDefaults.standard.data(forKey:"preferences.v3"),let defaults=try? JSONSerialization.jsonObject(with:JSONEncoder().encode(PreferenceValues())) as? [String:Any],let saved=try? JSONSerialization.jsonObject(with:data) as? [String:Any],let merged=try? JSONSerialization.data(withJSONObject:defaults.merging(saved,uniquingKeysWith:{$1})),let decoded=try? JSONDecoder().decode(PreferenceValues.self,from:merged){values=decoded}else{if let old=UserDefaults.standard.data(forKey:"preferences.v3"){UserDefaults.standard.set(old,forKey:"preferences.v3.corruptBackup.\(Int(Date().timeIntervalSince1970))")};values=PreferenceValues()}}
    func save(){if let data=try? JSONEncoder().encode(values){UserDefaults.standard.set(data,forKey:"preferences.v3")};applyTheme()}
    func applyTheme(){switch values.theme {case "Paper":NSApp.appearance=NSAppearance(named:.aqua);case "Midnight","Graphite":NSApp.appearance=NSAppearance(named:.darkAqua);default:NSApp.appearance=nil}}
    var web:[String:Any]{guard let data=try? JSONEncoder().encode(values) else{return [:]};var object=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any] ?? [:];object.removeValue(forKey:"customCSSBookmark")
        if let bookmark=Data(base64Encoded:values.customCSSBookmark),!bookmark.isEmpty{var stale=false;if let url=try? URL(resolvingBookmarkData:bookmark,options:.withSecurityScope,relativeTo:nil,bookmarkDataIsStale:&stale){let access=url.startAccessingSecurityScopedResource();defer{if access{url.stopAccessingSecurityScopedResource()}};if let css=try? String(contentsOf:url,encoding:.utf8),css.utf8.count<1_048_576{object["customCSS"]=css}}}
        return object}
}

struct SettingsView:View {
    @ObservedObject private var preferences=Preferences.shared
    @State private var section="Appearance"
    private let sections=["Appearance","Editing","Preview","Mermaid","Export","Snippets","Keyboard","Privacy"]
    var body:some View{
        HSplitView{
            List(sections,id:\.self,selection:$section){Text($0).padding(.vertical,6)}.frame(width:160)
            ScrollView{Form{
                switch section{
                case "Appearance":
                    Picker("Theme",selection:$preferences.values.theme){ForEach(["System","Paper","Midnight","Graphite"],id:\.self){Text($0)}}
                    TextField("Editor font",text:$preferences.values.editorFont)
                    size("Editor size",$preferences.values.editorSize,10...32)
                    size("Preview size",$preferences.values.previewSize,10...36)
                    LabeledContent("Line spacing",value:preferences.values.lineSpacing.formatted(.number.precision(.fractionLength(2))))
                    Slider(value:$preferences.values.lineSpacing,in:1...2)
                    Toggle("Show line numbers",isOn:$preferences.values.lineNumbers)
                    Toggle("Show current line highlight",isOn:$preferences.values.currentLine)
                    Toggle("Syntax-highlight code blocks",isOn:$preferences.values.highlightCode)
                    Toggle("Show status bar",isOn:$preferences.values.statusBar)
                case "Editing":
                    Toggle("Smart editing",isOn:$preferences.values.smartEditing)
                    Toggle("Smart headings",isOn:$preferences.values.smartHeadings)
                    Toggle("Smart quotes",isOn:$preferences.values.smartQuotes)
                    Toggle("Smart dashes",isOn:$preferences.values.smartDashes)
                    Toggle("Auto-pair brackets",isOn:$preferences.values.pairBrackets)
                    Toggle("Smart paste",isOn:$preferences.values.smartPaste)
                    Toggle("Live editing mode",isOn:$preferences.values.liveEditing)
                    Toggle("Soft wrap",isOn:$preferences.values.softWrap)
                    Toggle("Typewriter mode",isOn:$preferences.values.typewriter)
                    Toggle("Spellcheck",isOn:$preferences.values.spellcheck)
                    Toggle("Dim inactive paragraphs in Focus Mode",isOn:$preferences.values.dimInactive)
                    Toggle("Show Markdown tool palette",isOn:$preferences.values.toolPalette)
                    Toggle("Show source formatting ribbon",isOn:$preferences.values.formatRibbon)
                case "Preview":
                    Toggle("Live preview",isOn:$preferences.values.livePreview)
                    LabeledContent("Preview debounce",value:"\(Int(preferences.values.debounce*1000)) ms")
                    Slider(value:$preferences.values.debounce,in:0...0.5)
                    Toggle("Scroll sync",isOn:$preferences.values.scrollSync)
                    Toggle("Hide front matter",isOn:$preferences.values.hideFrontMatter)
                    Toggle("Open links in default browser",isOn:$preferences.values.externalLinks)
                case "Mermaid":
                    Toggle("Enable Mermaid rendering",isOn:$preferences.values.mermaidEnabled)
                    Toggle("Render Mermaid live",isOn:$preferences.values.mermaidLive)
                    Toggle("Theme follows app theme",isOn:$preferences.values.mermaidFollowsTheme)
                    Toggle("Show source below diagrams",isOn:$preferences.values.mermaidSource)
                    Toggle("Show diagrams in outline",isOn:$preferences.values.mermaidOutline)
                    Toggle("Enable visual editing",isOn:$preferences.values.visualEditing)
                    Toggle("Enable move and resize",isOn:$preferences.values.resizeDiagrams)
                    size("Default width",$preferences.values.diagramWidth,200...1400)
                    size("Default height",$preferences.values.diagramHeight,120...1000)
                    Picker("Alignment",selection:$preferences.values.diagramAlignment){ForEach(["Left","Center","Right"],id:\.self){Text($0)}}
                    Text("Strict security · Bundled Mermaid 12.2.0 · 33 diagram families").font(.caption).foregroundStyle(.secondary)
                case "Export":
                    Picker("Default format",selection:$preferences.values.exportFormat){ForEach(["HTML","PDF","DOCX","RTF","Slides","EPUB","LaTeX","Remarque","Embedded Markdown"],id:\.self){Text($0)}}
                    Picker("Image storage",selection:$preferences.values.imageStorage){Text("Linked — assets folder").tag("Linked");Text("Embedded — self-contained").tag("Embedded")}
                    Toggle("Include title page",isOn:$preferences.values.titlePage);Toggle("Include table of contents",isOn:$preferences.values.toc);Toggle("Include page numbers",isOn:$preferences.values.pageNumbers)
                    Picker("Paper size",selection:$preferences.values.pageSize){Text("Letter");Text("A4")}
                    Toggle("Landscape",isOn:$preferences.values.landscape);Toggle("Include front matter",isOn:$preferences.values.includeFrontMatter);Toggle("Embed images",isOn:$preferences.values.embedImages);Toggle("Inline CSS",isOn:$preferences.values.inlineCSS)
                    Toggle("Include Mermaid source in HTML",isOn:$preferences.values.htmlMermaidSource);Toggle("Include Mermaid source in DOCX",isOn:$preferences.values.docxMermaidSource)
                    HStack{Button("Choose Custom CSS…"){
                        let panel=NSOpenPanel();panel.allowedContentTypes=[.plainText];panel.allowsOtherFileTypes=true
                        if panel.runModal() == .OK,let url=panel.url,let css=try? String(contentsOf:url,encoding:.utf8),css.utf8.count<1_048_576{preferences.values.customCSS=css;preferences.values.customCSSBookmark=(try? url.bookmarkData(options:.withSecurityScope,includingResourceValuesForKeys:nil,relativeTo:nil).base64EncodedString()) ?? ""}
                    };Button("Clear CSS"){preferences.values.customCSS="";preferences.values.customCSSBookmark=""}.disabled(preferences.values.customCSS.isEmpty)}
                    Text(preferences.values.customCSS.isEmpty ? "No custom stylesheet":"Custom stylesheet stored locally for HTML and slides.").font(.caption)
                case "Snippets":
                    ForEach($preferences.values.snippets){$snippet in
                        VStack(alignment:.leading){HStack{TextField("Name",text:$snippet.name);TextField("Trigger",text:$snippet.trigger).frame(width:110);Button(role:.destructive){preferences.values.snippets.removeAll{$0.id==snippet.id}}label:{Image(systemName:"trash")}}
                            TextEditor(text:$snippet.body).font(.system(.body,design:.monospaced)).frame(height:80).border(.quaternary)
                        }.padding(.vertical,8)
                    }
                    Button("Add snippet"){preferences.values.snippets.append(.init(name:"New snippet",trigger:"new",body:"$0"))}
                    Text("Type a trigger and press Tab. $0 marks the insertion point.").font(.caption)
                case "Keyboard":
                    ForEach(keyboardReference,id:\.0){row in LabeledContent(row.0,value:row.1)}
                default:
                    Text("Your documents stay on your Mac. Remarque has no account, telemetry, or cloud service. Markdown is the saved document format. Rendering engines are bundled; HTTP and HTTPS resources are blocked in the editor.")
                    Text("Folder access is granted through macOS file dialogs. Local history and crash recovery live in Remarque’s Application Support folder.")
                }
            }.formStyle(.grouped).padding(12)}.frame(minWidth:460)
        }.frame(width:760,height:620)
    }
    func size(_ label:String,_ value:Binding<Double>,_ range:ClosedRange<Double>)->some View{VStack{LabeledContent(label,value:"\(Int(value.wrappedValue)) pt");Slider(value:value,in:range,step:1)}}
}
let keyboardReference:[(String,String)]=[("New document","⌘N"),("Open","⌘O"),("Save","⌘S"),("Save As","⇧⌘S"),("Save version","⌃⌘S"),("Find and replace","⌘F"),("Command palette","⇧⌘P"),("Bold / italic","⌘B / ⌘I"),("Insert link","⌘K"),("Code block","⌥⌘C"),("Insert equation","⌃⌘E"),("Mermaid gallery","⌥⌘M"),("Visual diagram editor","⇧⌘M"),("Format document","⌥⌘L"),("Toggle preview / outline","⌥⌘P / ⌥⌘O"),("Focus / typewriter","⌥⌘F / ⌥⌘T"),("Presentation","⌥⌘Return"),("Print","⌘P"),("Undo / redo","⌘Z / ⇧⌘Z")]
