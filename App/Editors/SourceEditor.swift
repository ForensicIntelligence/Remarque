import AppKit
import SwiftUI
import RemarqueCore

@MainActor final class SourceTextView: NSTextView {
    weak var session: DocumentSession?
    override func keyDown(with event: NSEvent) {
        if event.modifierFlags.contains(.command), event.charactersIgnoringModifiers == "z" {
            if event.modifierFlags.contains(.shift) { session?.redo() } else { session?.undo() }; return
        }
        if smartKey(event){return}
        super.keyDown(with:event)
    }
    override func performDragOperation(_ sender:any NSDraggingInfo)->Bool{
        guard let session else{return super.performDragOperation(sender)}
        let pasteboard=sender.draggingPasteboard
        if let urls=pasteboard.readObjects(forClasses:[NSURL.self],options:nil) as? [URL],let url=urls.first{
            if url.isFileURL,["png","jpg","jpeg","gif","svg","tiff","webp"].contains(url.pathExtension.lowercased()){
                let point=convert(sender.draggingLocation,from:nil),offset=characterIndexForInsertion(at:point)
                session.select(.init(offset,offset),surface:"source")
                do{try MediaStore.insert(Data(contentsOf:url),extension:url.pathExtension,in:session);return true}catch{session.error=error.localizedDescription;return false}
            }
            if ["https","http"].contains(url.scheme?.lowercased() ?? ""){
                let range=selectedRange(),label=(string as NSString).substring(with:range),text="[\(label.isEmpty ? url.absoluteString:label.replacingOccurrences(of:"]",with:"\\]"))](\(url.absoluteString.replacingOccurrences(of:")",with:"%29")))"
                session.apply([.init(.init(range.location,NSMaxRange(range)),text)],label:"Insert Link");return true
            }
        }
        return super.performDragOperation(sender)
    }
    override func paste(_ sender:Any?){
        if let session,let data=NSPasteboard.general.data(forType:.png){do{try MediaStore.insert(data,extension:"png",in:session)}catch{session.error=error.localizedDescription};return}
        if let session,let data=NSPasteboard.general.data(forType:.tiff),let rep=NSBitmapImageRep(data:data),let png=rep.representation(using:.png,properties:[:]){do{try MediaStore.insert(png,extension:"png",in:session)}catch{session.error=error.localizedDescription};return}
        if Preferences.shared.values.smartPaste,let html=NSPasteboard.general.string(forType:.html){session?.command("pasteHTML",value:html);return}
        super.paste(sender)
    }
}

struct SourceEditor: NSViewRepresentable {
    @ObservedObject var session: DocumentSession
    @ObservedObject private var preferences=Preferences.shared
    func makeCoordinator() -> Coordinator { Coordinator(session) }
    func makeNSView(context: Context) -> NSScrollView {
        let scroll=NSScrollView();scroll.hasVerticalScroller=true;scroll.autohidesScrollers=true;scroll.borderType = .noBorder
        let text=SourceTextView(frame:.zero);text.session=session;text.isRichText=false;text.importsGraphics=false;text.allowsUndo=false
        text.isVerticallyResizable=true;text.isHorizontallyResizable=false;text.autoresizingMask = [.width]
        text.textContainer?.widthTracksTextView=true;text.textContainer?.containerSize=NSSize(width:0,height:CGFloat.greatestFiniteMagnitude)
        text.font = .monospacedSystemFont(ofSize:session.sourceSize,weight:.regular)
        text.textContainerInset=NSSize(width:22,height:22);text.backgroundColor = .textBackgroundColor;text.textColor = .textColor
        text.isAutomaticQuoteSubstitutionEnabled=false;text.isAutomaticDashSubstitutionEnabled=false
        text.isAutomaticTextReplacementEnabled=false;text.isContinuousSpellCheckingEnabled=true
        text.usesFindBar=true;text.setAccessibilityLabel("Markdown source editor");text.setAccessibilityIdentifier("sourceEditor")
        text.registerForDraggedTypes([.fileURL,.URL,.png,.tiff]);text.string=session.source;text.delegate=context.coordinator;text.highlightSyntax()
        context.coordinator.textView=text;scroll.documentView=text
        session.revealSource = { [weak text, weak coordinator=context.coordinator] range in
            guard let text, let coordinator, range.location+range.length <= (text.string as NSString).length else{return}
            coordinator.updating=true;text.setSelectedRange(range);text.scrollRangeToVisible(range);coordinator.updating=false
        }
        session.scrollSource = { [weak text,weak scroll] offset in
            guard let text,let scroll,text.window?.firstResponder !== text else{return}
            let range=NSRange(location:offset,length:0);text.scrollRangeToVisible(range);scroll.verticalRulerView?.needsDisplay=true
        }
        scroll.contentView.postsBoundsChangedNotifications=true
        NotificationCenter.default.addObserver(context.coordinator,selector:#selector(Coordinator.scrolled(_:)),name:NSView.boundsDidChangeNotification,object:scroll.contentView)
        scroll.verticalRulerView=LineNumberRuler(scrollView:scroll,orientation:.verticalRuler)
        scroll.hasVerticalRuler=true
        return scroll
    }
    func updateNSView(_ scroll: NSScrollView, context: Context) {
        guard let text=scroll.documentView as? SourceTextView else{return}
        let c=context.coordinator;c.updating=true;defer{c.updating=false}
        let prefs=preferences.values
        scroll.rulersVisible=prefs.lineNumbers;scroll.verticalRulerView?.needsDisplay=true
        text.isAutomaticQuoteSubstitutionEnabled=prefs.smartQuotes;text.isAutomaticDashSubstitutionEnabled=prefs.smartDashes
        text.isContinuousSpellCheckingEnabled=prefs.spellcheck
        text.isHorizontallyResizable = !prefs.softWrap;scroll.hasHorizontalScroller = !prefs.softWrap
        text.textContainer?.widthTracksTextView=prefs.softWrap
        if !prefs.softWrap{text.textContainer?.containerSize=NSSize(width:100000,height:CGFloat.greatestFiniteMagnitude)}
        if text.string != session.source && !text.hasMarkedText() {
            text.string=session.source
            let range=session.selection.range.nsRange
            let n=(text.string as NSString).length;text.setSelectedRange(NSRange(location:min(range.location,n),length:min(range.length,max(0,n-range.location))))
        }
        text.highlightSyntax()
    }
    @MainActor final class Coordinator: NSObject, NSTextViewDelegate {
        let session:DocumentSession
        weak var textView:SourceTextView?
        var updating=false
        var compositionSource:String?
        init(_ session:DocumentSession){self.session=session}
        @objc func scrolled(_ notification:Notification){
            guard let t=textView,t.window?.firstResponder===t,Preferences.shared.values.scrollSync else{return}
            let point=NSPoint(x:t.textContainerInset.width+4,y:t.visibleRect.minY+8)
            let offset=t.characterIndexForInsertion(at:point)
            session.sendWeb?(["type":"scroll","revision":session.revision,"start":offset])
            t.enclosingScrollView?.verticalRulerView?.needsDisplay=true
        }
        func textDidChange(_ notification:Notification){
            guard !updating,let t=textView else{return}
            if t.hasMarkedText(){if compositionSource==nil{compositionSource=session.source};return}
            if let baseline=compositionSource,baseline != session.source{
                compositionSource=nil
                let local=DocumentEngine.minimalPatch(from:baseline,to:t.string),external=DocumentEngine.minimalPatch(from:baseline,to:session.source)
                if local.range.end<external.range.start || local.range.start>external.range.end{
                    let delta=external.text.utf16.count-external.range.length,shift=local.range.start>external.range.end ? delta:0
                    session.apply([.init(.init(local.range.start+shift,local.range.end+shift),local.text)],selection:.init(.init(local.range.start+shift+local.text.utf16.count,local.range.start+shift+local.text.utf16.count)),label:"Compose")
                }else{AppWindows.shared.newDocument(text:t.string);session.error="An external edit interrupted text composition. Your complete draft has been preserved in a new unsaved document."}
                updating=true;t.string=session.source;t.setSelectedRange(session.selection.range.nsRange);updating=false
            }else{compositionSource=nil;session.replaceSource(t.string,selection:t.selectedRange())}
            t.highlightSyntax()
        }
        func textViewDidChangeSelection(_ notification:Notification){
            guard !updating,let t=textView,t.window?.firstResponder===t else{return}
            DispatchQueue.main.async { [weak self,weak t] in
                guard let self,let t,!self.updating,t.window?.firstResponder===t else{return}
                let r=t.selectedRange()
                if Preferences.shared.values.typewriter,let layout=t.layoutManager,let container=t.textContainer,let scroll=t.enclosingScrollView,r.location<t.string.utf16.count{
                    let glyph=layout.glyphRange(forCharacterRange:NSRange(location:r.location,length:0),actualCharacterRange:nil),rect=layout.boundingRect(forGlyphRange:glyph,in:container)
                    let y=max(0,rect.midY+t.textContainerInset.height-scroll.contentView.bounds.height/2)
                    scroll.contentView.scroll(to:NSPoint(x:scroll.contentView.bounds.minX,y:y));scroll.reflectScrolledClipView(scroll.contentView)
                }
                t.highlightSyntax();self.session.select(.init(r.location,r.location+r.length),surface:"source")
            }
        }
    }
}

@MainActor final class LineNumberRuler:NSRulerView {
    override var isFlipped:Bool{true}
    override func drawHashMarksAndLabels(in rect:NSRect){
        guard let text=scrollView?.documentView as? NSTextView,let layout=text.layoutManager,let container=text.textContainer else{return}
        ruleThickness=48;NSColor.windowBackgroundColor.setFill();bounds.fill()
        let ns=text.string as NSString,visible=text.visibleRect,attributes:[NSAttributedString.Key:Any]=[.font:NSFont.monospacedDigitSystemFont(ofSize:10,weight:.regular),.foregroundColor:NSColor.secondaryLabelColor]
        guard layout.numberOfGlyphs>0 else{return}
        var offset=0,line=1
        while offset<=ns.length{
            let glyph=layout.glyphIndexForCharacter(at:min(offset,max(0,ns.length-1))),box=layout.lineFragmentRect(forGlyphAt:glyph,effectiveRange:nil)
            let y=box.minY+text.textContainerInset.height-visible.minY
            if y>visible.height{break}
            if y>=(-box.height){let label=String(line) as NSString;label.draw(at:NSPoint(x:ruleThickness-label.size(withAttributes:attributes).width-8,y:y+2),withAttributes:attributes)}
            if offset==ns.length{break};let next=NSMaxRange(ns.lineRange(for:NSRange(location:offset,length:0)));if next<=offset{break};offset=next;line+=1
        }
    }
}
