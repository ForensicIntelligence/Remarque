import AppKit
import SwiftUI
import WebKit

struct HelpArticle:Identifiable {
    let id:String
    let body:String
    var title:String{id}
    var icon:String{
        if id.hasPrefix("Mermaid"){return "point.3.connected.trianglepath.dotted"}
        if id.contains("Math"){return "function"}
        if id.contains("Settings") || id.contains("Themes"){return "slider.horizontal.3"}
        if id.contains("Keyboard"){return "keyboard"}
        if id.contains("Export"){return "square.and.arrow.up"}
        if id.contains("Preview") || id.contains("Editor"){return "rectangle.split.2x1"}
        return id=="Welcome" ? "sparkles":"book.closed"
    }
}
@MainActor enum HelpLibrary {
    static let articles:[HelpArticle]={
        guard let root=Bundle.main.resourceURL?.appendingPathComponent("Help") else{return []}
        let urls=(try? FileManager.default.contentsOfDirectory(at:root,includingPropertiesForKeys:nil)) ?? []
        return urls.filter{$0.pathExtension=="md"}.compactMap{url in
            guard let body=try? String(contentsOf:url,encoding:.utf8) else{return nil}
            return HelpArticle(id:url.deletingPathExtension().lastPathComponent,body:body)
        }.sorted{a,b in a.id=="Welcome" || (b.id != "Welcome" && a.id<b.id)}
    }()
}
@MainActor final class HelpNavigation:ObservableObject {
    static let shared=HelpNavigation()
    @Published private(set) var selected="Welcome"
    @Published private(set) var history:[String]=[]
    func open(_ id:String){guard id != selected,HelpLibrary.articles.contains(where:{$0.id==id}) else{return};history.append(selected);if history.count>100{history.removeFirst()};selected=id}
    func back(){guard let previous=history.popLast() else{return};selected=previous}
}
struct HelpView:View {
    @ObservedObject private var navigation=HelpNavigation.shared
    @State private var query=""
    @State private var scale=1.0
    var matches:[HelpArticle]{HelpLibrary.articles.filter{query.isEmpty || ($0.title+" "+$0.body).localizedCaseInsensitiveContains(query)}}
    var body:some View{
        HSplitView{
            VStack(alignment:.leading,spacing:0){
                Label("Remarque Guide",systemImage:"book.pages").font(.headline).padding([.top,.horizontal],16)
                TextField("Search documentation",text:$query).textFieldStyle(.roundedBorder).padding(12)
                if matches.isEmpty{Text("No topics match “\(query)”.").foregroundStyle(.secondary).padding();Spacer()}
                else{List(matches,selection:Binding<String?>(get:{navigation.selected},set:{if let id=$0{navigation.open(id)}})){article in
                    Label(article.title,systemImage:article.icon).font(.callout).padding(.vertical,5).tag(article.id)
                }}
                Text("Illustrated guides · Available offline").font(.caption).foregroundStyle(.secondary).padding(12)
            }.frame(minWidth:210,idealWidth:245,maxWidth:290)
            VStack(spacing:0){
                HStack{
                    Button{navigation.back()}label:{Image(systemName:"chevron.left")}.help("Previous topic").accessibilityLabel("Previous topic").disabled(navigation.history.isEmpty)
                    Text(navigation.selected).font(.headline).lineLimit(1)
                    Spacer()
                    Button{scale=max(0.85,scale-0.1)}label:{Image(systemName:"textformat.size.smaller")}.accessibilityLabel("Smaller help text").disabled(scale<=0.85)
                    Button{scale=min(1.6,scale+0.1)}label:{Image(systemName:"textformat.size.larger")}.accessibilityLabel("Larger help text").disabled(scale>=1.6)
                }.padding(12)
                Divider()
                if let article=HelpLibrary.articles.first(where:{$0.id==navigation.selected}){HelpReader(article:article,scale:scale)}
            }.frame(minWidth:570)
        }.frame(minWidth:880,idealWidth:1100,minHeight:620,idealHeight:740)
    }
}

struct HelpReader:NSViewRepresentable {
    let article:HelpArticle
    var scale=1.0
    @ObservedObject private var preferences=Preferences.shared
    func makeCoordinator()->Coordinator{Coordinator()}
    func makeNSView(context:Context)->WKWebView{Self.makeView(coordinator:context.coordinator)}
    static func makeView(coordinator:Coordinator)->WKWebView{
        let config=WKWebViewConfiguration();config.websiteDataStore = .nonPersistent()
        config.userContentController.add(coordinator,name:"remarqueHelp")
        let web=WKWebView(frame:.zero,configuration:config);web.navigationDelegate=coordinator;coordinator.web=web
        web.setAccessibilityIdentifier("helpReader");web.setAccessibilityLabel("Illustrated documentation")
        if let url=Bundle.main.url(forResource:"help",withExtension:"html",subdirectory:"Editor"){
            coordinator.entryURL=url
            web.loadFileURL(url,allowingReadAccessTo:url.deletingLastPathComponent())
        }
        return web
    }
    func updateNSView(_ web:WKWebView,context:Context){context.coordinator.show(article,theme:preferences.values.theme,scale:scale)}
    static func dismantleNSView(_ web:WKWebView,coordinator:Coordinator){web.configuration.userContentController.removeScriptMessageHandler(forName:"remarqueHelp")}
    @MainActor final class Coordinator:NSObject,WKNavigationDelegate,WKScriptMessageHandler{
        weak var web:WKWebView?
        var entryURL:URL?
        var ready=false
        private var article:HelpArticle?
        private var theme="System",scale=1.0
        func show(_ article:HelpArticle,theme:String,scale:Double){
            let changed=self.article?.id != article.id || self.theme != theme || self.scale != scale
            self.article=article;self.theme=theme;self.scale=scale
            if ready && changed{render()}
        }
        func render(){guard let article else{return};web?.callAsyncJavaScript("window.RemarqueHelp.show(article)",arguments:["article":["title":article.title,"source":article.body,"theme":theme,"scale":scale]],in:nil,in:.page){_ in}}
        func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){ready=true;render()}
        func webView(_ webView:WKWebView,decidePolicyFor navigationAction:WKNavigationAction,decisionHandler:@escaping @MainActor (WKNavigationActionPolicy)->Void){
            guard navigationAction.navigationType != .linkActivated else{decisionHandler(.cancel);return}
            decisionHandler(navigationAction.request.url?.standardizedFileURL==entryURL?.standardizedFileURL ? .allow:.cancel)
        }
        func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage){
            guard message.frameInfo.isMainFrame,message.frameInfo.request.url?.standardizedFileURL==entryURL?.standardizedFileURL,let body=message.body as? [String:String],let action=body["action"],let value=body["value"],value.utf8.count<65536 else{return}
            switch action{
            case "topic":HelpNavigation.shared.open(value)
            case "settings":if value=="Preview"{AppWindows.shared.settings("Preview")}
            case "copy":NSPasteboard.general.clearContents();NSPasteboard.general.setString(value,forType:.string)
            default:break
            }
        }
        func webViewWebContentProcessDidTerminate(_ webView:WKWebView){ready=false;webView.reload()}
    }
}
