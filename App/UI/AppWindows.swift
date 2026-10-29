import AppKit
import SwiftUI
import RemarqueCore

@MainActor final class AppWindows {
    static let shared=AppWindows()
    private var windows:[String:NSWindowController]=[:]
    func show<Content:View>(_ key:String,title:String,content:()->Content){
        if let controller=windows[key]{controller.showWindow(nil);controller.window?.makeKeyAndOrderFront(nil);return}
        let view=NSHostingView(rootView:content());let window=NSWindow(contentRect:NSRect(x:0,y:0,width:800,height:600),styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false)
        window.title=title;window.contentView=view;window.isReleasedWhenClosed=false;window.center();let controller=NSWindowController(window:window);windows[key]=controller;controller.showWindow(nil)
    }
    func settings(){show("settings",title:"Remarque Settings"){SettingsView()}}
    func workspace(){show("workspace",title:"Workspace"){WorkspaceView()}}
    func history(_ session:DocumentSession){show("history-"+session.id,title:"Version History"){HistoryView(session:session)}}
    func start(){show("start",title:"Welcome to Remarque"){StartView()}}
    func help(){show("help",title:"Remarque Documentation"){HelpView()}}
    func newDocument(text:String=""){
        let doc=RemarqueDocument();doc.session.load(text)
        if !text.isEmpty{doc.session.engineMarkInitialUnsaved()}
        NSDocumentController.shared.addDocument(doc);doc.makeWindowControllers();doc.showWindows()
    }
}
struct StartView:View {
    @State private var recoveries:[RecoveryEntry]=[]
    let templates=["Blank Document","Guided Tour","Technical Spec","Meeting Notes","Diagram Doc","Product Plan"]
    var body:some View{
        HStack(spacing:0){
            VStack(alignment:.leading,spacing:18){Image(nsImage:NSApp.applicationIconImage).resizable().frame(width:74,height:74);Text("Remarque").font(.system(size:32,weight:.bold));Text("Markdown. Beautifully refined.").foregroundStyle(.secondary);Text(BuildInfo.label).font(.caption).foregroundStyle(.secondary)
                Button("Open Document…"){NSDocumentController.shared.openDocument(nil)}.keyboardShortcut("o");Button("Documentation"){AppWindows.shared.help()};Button("Settings…"){AppWindows.shared.settings()};Spacer()
                Link("Forensic Intelligence",destination:URL(string:"https://forensicintelligence.ca")!)
            }.padding(30).frame(width:280).background(.quaternary.opacity(0.3))
            ScrollView{VStack(alignment:.leading,spacing:20){
                Text("Create a document").font(.title2)
                LazyVGrid(columns:[GridItem(.flexible()),GridItem(.flexible())],spacing:12){ForEach(templates,id:\.self){name in Button{AppWindows.shared.newDocument(text:template(name))}label:{HStack{Image(systemName:"doc.text").font(.title2).foregroundStyle(.blue);Text(name);Spacer()}.padding(16).frame(maxWidth:.infinity,alignment:.leading)}.buttonStyle(.bordered)}}
                Text("Recent documents").font(.headline)
                if NSDocumentController.shared.recentDocumentURLs.isEmpty{Text("No recent documents.").foregroundStyle(.secondary)}
                ForEach(NSDocumentController.shared.recentDocumentURLs,id:\.self){url in Button{NSDocumentController.shared.openDocument(withContentsOf:url,display:true){_,_,_ in}}label:{VStack(alignment:.leading){Text(url.lastPathComponent);Text(url.deletingLastPathComponent().path).font(.caption).foregroundStyle(.secondary)}}.buttonStyle(.plain)}
                if !recoveries.isEmpty{Text("Recover unsaved work").font(.headline);ForEach(recoveries){entry in Button("Recover \(entry.filePath.map{URL(fileURLWithPath:$0).lastPathComponent} ?? "Untitled") · \(entry.date.formatted())"){AppWindows.shared.newDocument(text:entry.source);Task{try? await LocalStorage.history.removeRecovery(entry.id);recoveries.removeAll{$0.id==entry.id}}}}}
            }.padding(28)}
        }.frame(width:900,height:620).task{recoveries=(try? await LocalStorage.history.recoveries()) ?? []}
    }
    func template(_ name:String)->String{guard name != "Blank Document",let url=Bundle.main.url(forResource:name,withExtension:"md",subdirectory:"Templates") else{return ""};return (try? String(contentsOf:url,encoding:.utf8)) ?? ""}
}
struct HelpArticle:Identifiable {var id:String;var title:String;var body:String}
struct HelpView:View {
    @State private var query=""
    @State private var selected:String?="Welcome"
    var articles:[HelpArticle]{
        let urls=(try? FileManager.default.contentsOfDirectory(at:Bundle.main.resourceURL!.appendingPathComponent("Help"),includingPropertiesForKeys:nil)) ?? []
        return urls.filter{$0.pathExtension=="md"}.map{.init(id:$0.deletingPathExtension().lastPathComponent,title:$0.deletingPathExtension().lastPathComponent,body:(try? String(contentsOf:$0,encoding:.utf8)) ?? "")}.sorted{$0.title<$1.title}
    }
    var body:some View{
        HSplitView{VStack{TextField("Search documentation",text:$query).textFieldStyle(.roundedBorder).padding(12);List(articles.filter{query.isEmpty || ($0.title+" "+$0.body).localizedCaseInsensitiveContains(query)},selection:$selected){article in Text(article.title).tag(article.id)}}.frame(width:230)
            ScrollView{if let article=articles.first(where:{$0.id==selected}){VStack(alignment:.leading,spacing:18){Text(article.title).font(.largeTitle.bold());Text(LocalizedStringKey(article.body)).textSelection(.enabled).font(.body).lineSpacing(6)}.padding(32).frame(maxWidth:760,alignment:.leading)}}.frame(minWidth:490)
        }.frame(width:950,height:650)
    }
}
